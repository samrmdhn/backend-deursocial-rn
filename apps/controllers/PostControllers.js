import { createNameFile, dateToEpochTime, getDataUserUsingToken, getExtension, isMoreThanOneMonthFromTimestamp, withTransaction } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import db from "../../configs/Database.js";
import { uploadFile } from "../../helpers/FileUpload.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import SegmentedPostContentDetailModels from "../models/SegmentedPostContentDetailModels.js";
import PostContentDetailModels from "../models/PostContentDetailModels.js";
import FilePostContentDetailModels from "../models/FilePostContentDetailModels.js";
import { parseToRichText } from "../../libs/ParseToRichText.js";
import TopicPostModels from "../models/TopicPostModels.js";
import TopicPostRelationsModels from "../models/TopicPostRelationsModels.js";


export const getPost = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = {
            usersId: users_id,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };

        const query = `
            SELECT
                pcds.caption_post AS caption,
                pcds.slug,
                CASE 
                    WHEN pcds.type = 0 THEN 'global'
                    WHEN pcds.type = 1 THEN 'event'
                    ELSE 'ticket' 
                END AS event_type,
                (
                    SELECT COUNT(*)
                    FROM ir_impression_post_content_details ipcds
                    WHERE ipcds.post_content_details_id = pcds.id
                ) AS total_impressions,
                (
                    SELECT COUNT(*)
                    FROM ir_like_post_content_details lpcds
                    WHERE lpcds.post_content_details_id = pcds.id
                ) AS total_likes,
                (
                    SELECT COUNT(*)
                    FROM ir_comment_post_content_details cpcds
                    WHERE cpcds.post_content_details_id = pcds.id
                ) AS total_comments,
                TO_CHAR(TO_TIMESTAMP(pcds.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'username', u.username
                ) AS user,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'image', fpcds.file
                        )
                    ), '[]')
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images,
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_like_post_content_details l
                        WHERE l.post_content_details_id = pcds.id
                        AND l.users_id = :usersId
                    )
                ) AS post_liked,
                COALESCE((
                    SELECT json_build_object(
                        'id', topic.id,
                        'title', topic.text_title
                    )
                    FROM ir_topic_post_relations topic_rel
                    LEFT JOIN ir_topic_posts topic ON topic.id = topic_rel.topic_posts_id
                    WHERE topic_rel.post_content_details_id = pcds.id
                    LIMIT 1
                ), '{}'::json) AS topic
            FROM
                ir_post_content_details pcds
                JOIN ir_users u ON pcds.users_id = u.id
            WHERE
                pcds.is_accepted = 1 AND pcds.type = 0
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset;
        `;
        const executeQuery = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details pcds
            WHERE pcds.is_accepted = 1 AND pcds.type = 0
        `;
        const totalCountResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
        });

        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            executeQuery,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: parseInt(limit, 10),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};


export const createPostContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const xDateFor = req.headers["x-date-for"];
            const userDate = new Date(xDateFor);
            if (isNaN(userDate.getTime())) {
                return responseApi(res, [], null, "Whats wrong dude? jajajajaja", 400);
            }
            const { caption_post, event_slug, post_type, topic_id } = req.body;

            if (caption_post.length > 100) {
                return responseApi(res, [], null, "Caption to long", 400);
            }
            if (Number(post_type) == 2 && typeof event_slug === "undefined") {
                throw new Error("Data wrong because event slug not valid!");
            }
            const data = {
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                caption_post: parseToRichText(caption_post),
                caption_post_raw: caption_post,
                slug: btoa(dateToEpochTime(req.headers["x-date-for"])),
                users_id: users_id,
                type: post_type,
                is_accepted: 1
            };
            const dataPost = await PostContentDetailModels.create(data, {
                transaction,
            });
            if (topic_id) {
                await TopicPostRelationsModels.create({
                    users_id: users_id,
                    post_content_details_id: dataPost.id,
                    topic_posts_id: topic_id
                }, {
                    transaction,
                });
            }
            const files = req.files && req.files.image;
            if (files) {
                for (const file of files) {
                    const fileDate = new Date();
                    let filesNamed = fileDate.getTime() + getExtension(file.name);
                    filesNamed = createNameFile(filesNamed);
                    const ext = getExtension(file.name);
                    if (ext !== ".jpg" && ext !== ".png") {
                        return responseApi(res, [], null, "Image not valid", 400);
                    }
                    const fileDestination = process.env.APP_LOCATION_FILE + filesNamed;
                    await FilePostContentDetailModels.create(
                        {
                            post_content_details_id: dataPost.id,
                            file: filesNamed,
                            created_at: dateToEpochTime(req.headers["x-date-for"]),
                        },
                        { transaction }
                    );
                    await uploadFile(file, fileDestination);
                }
            }

            return responseApi(res, [{ "post_slug": dataPost.slug }], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error post", error);
            throw error;
        }
    }
);

export const createTopicPost = withTransaction(async (req, res, transaction) => {
    try {
        const { title } = req.body;
        await TopicPostModels.create({
            text_title: title,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        }, {
            transaction,
        });
        return responseApi(res, null, null, "Data has been saved", 0);
    } catch (error) {
        console.log("error create Topic Post", error);
        throw error;
    }
})

export const getTopicPost = async (req, res) => {
    try {
        const { search_text, limit, page } = req.query;
        let whereClause = '';
        const offset = (page - 1) * limit;
        const replacements = {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        if (search_text) {
            whereClause += `WHERE text_title ILIKE :title`;
            replacements.title = `%${search_text}%`;
        }
        const query = `
            SELECT 
                id,
                text_title as title
            FROM ir_topic_posts ${whereClause}
            LIMIT :limit OFFSET :offset;
        `
        const executeQuery = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        return responseApi(res, executeQuery, null, "Data has been retrivied")
    } catch (error) {
        console.log("error get topic post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}