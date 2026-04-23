import { createNameFile, dateToEpochTime, getDataUserUsingToken, getExtension, isMoreThanOneMonthFromTimestamp, makeRandomString, withTransaction } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import db from "../../configs/Database.js";
import { deleteFile, fileExists, uploadFile } from "../../helpers/FileUpload.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import SegmentedPostContentDetailModels from "../models/SegmentedPostContentDetailModels.js";
import PostContentDetailModels from "../models/PostContentDetailModels.js";
import FilePostContentDetailModels from "../models/FilePostContentDetailModels.js";
import { parseToRichText } from "../../libs/ParseToRichText.js";
import TopicPostModels from "../models/TopicPostModels.js";
import TopicPostRelationsModels from "../models/TopicPostRelationsModels.js";
import { generateNotificationMessage } from "../../helpers/notification.js";
import CommentPostContentDetailModels from "../models/CommentPostContentDetailModels.js";
import LikePostContentDetailModels from "../models/LikePostContentDetailModels.js";
import ImpressionPostContentDetailModels from "../models/ImpressionPostContentDetailModels.js";
import UsersModels from "../models/UsersModels.js";


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
                TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'verified', CASE 
                        WHEN u.is_verified = 1 THEN true
                        ELSE false END,
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
            if (users_id == 0) {
                return responseApi(res, [], null, "Login needed", 400);
            }

            const { caption_post, event_slug, post_type, topic_id } = req.body;
            if (!topic_id) {
                return responseApi(res, [], null, "What topic do you want to discuss?", 418);
            }
            if (caption_post.length > 300) {
                return responseApi(res, [], null, "Caption to long", 418);
            }
            if (Number(post_type) == 2 && typeof event_slug === "undefined") {
                return responseApi(res, [], null, "What are you doing?", 418);
            }
            const data = {
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                caption_post: parseToRichText(caption_post),
                caption_post_raw: caption_post,
                slug: btoa(dateToEpochTime(req.headers["x-date-for"]) + "-" + makeRandomString(3)),
                users_id: users_id,
                type: post_type,
                is_accepted: 1
            };
            const dataPost = await PostContentDetailModels.create(data, {
                transaction,
            });
            await TopicPostRelationsModels.create({
                users_id: users_id,
                post_content_details_id: dataPost.id,
                topic_posts_id: topic_id
            }, {
                transaction,
            });
            let files = req.files && req.files.images;
            if (files) {
                if (!Array.isArray(files)) {
                    files = [files];
                }
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

export const commentPostPerContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const { comment_post } = req.body;
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id === 0) {
                return responseApi(res, [], null, "What are you doing? You can login yaah", 418);
            }
            const slugPostContentDetail = req.params.slugPost;
            const getIdPostContentDetail =
                await PostContentDetailModels.findOne({
                    where: {
                        slug: slugPostContentDetail,
                    },
                });
            if (!getIdPostContentDetail) {
                return responseApi(
                    res,
                    [],
                    null,
                    "You can't comment this post....",
                    400
                );
            }
            if (getIdPostContentDetail.is_accepted == 0) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Something wrong in your post, stay tune yaah :)",
                    500
                );
            }
            if (getIdPostContentDetail.is_accepted == 2) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Something wrong in your post",
                    500
                );
            }
            if (comment_post.length > 100) {
                return responseApi(res, [], null, "Comment to long", 400);
            }
            const { parent_id } = req.body;
            const commentPostData = await CommentPostContentDetailModels.create(
                {
                    users_id: users_id,
                    post_content_details_id: getIdPostContentDetail.id,
                    comment_post: comment_post,
                    parent_id: parent_id || null,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                },
                { transaction }
            );
            if (getIdPostContentDetail.users_id !== users_id) {
                await generateNotificationMessage({
                    source_id: commentPostData.id,
                    users_id: getIdPostContentDetail.users_id,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                    type: 7
                })
            }
            // Fetch the user info to return a complete comment object
            const userInfo = await db.query(
                `SELECT display_name AS name, photo AS image, username, CASE WHEN is_verified = 1 THEN true ELSE false END AS verified FROM ir_users WHERE id = :uid`,
                { replacements: { uid: users_id }, type: db.QueryTypes.SELECT, plain: true }
            );
            const newComment = {
                id: commentPostData.id,
                comment_post: comment_post,
                users_id: users_id,
                parent_id: parent_id || null,
                user: userInfo || {},
                created_at: new Date(commentPostData.created_at * 1000).toISOString(),
            };
            return responseApi(res, [newComment], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error function commentPostPerContentDetail", error);
            throw error;
        }
    }
);

export const getCommentPostPerContentDetail = async (req, res) => {
    try {
        const slugPostContentDetail = req.params.slugPost;
        let whereClause = `WHERE pcds.slug = :slugPostContentDetail`;
        const { page = 1 } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let replacements = {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            slugPostContentDetail: slugPostContentDetail,
        };

        const query = `
            SELECT cpcds.id, cpcds.comment_post, cpcds.users_id, cpcds.parent_id,
                json_build_object(
                        'name', u.display_name,
                        'image', u.photo,
                        'username', u.username,
                        'verified', CASE 
                            WHEN u.is_verified = 1 THEN true
                            ELSE false END
                ) AS user,
            TO_CHAR(TO_TIMESTAMP(cpcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at
            FROM 
            ir_comment_post_content_details cpcds 
            LEFT JOIN ir_post_content_details pcds ON cpcds.post_content_details_id = pcds.id
            LEFT JOIN ir_users u ON cpcds.users_id = u.id
            ${whereClause}
            AND cpcds.parent_id IS NULL
            ORDER BY cpcds.created_at DESC
            LIMIT :limit OFFSET :offset;
        `;
        const executeQuery = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const countQuery = `
        SELECT COUNT(*) AS total_count
            FROM 
            ir_comment_post_content_details cpcds 
            LEFT JOIN ir_post_content_details pcds ON cpcds.post_content_details_id = pcds.id
            LEFT JOIN ir_users u ON cpcds.users_id = u.id
        ${whereClause}
        AND cpcds.parent_id IS NULL
    `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);
        return responseApi(
            res,
            executeQuery,
            {
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: parseInt(limit, 10),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data has been retrived",
            0
        );
    } catch (error) {
        console.log("error on function getCommentPostPerContentDetail", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const likePostPerContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id === 0) {
                return responseApi(res, [], null, "What are you doing? You can login yaah", 418);
            }
            const slugPostContentDetail = req.params.slugPost;
            const getIdPostContentDetail =
                await PostContentDetailModels.findOne({
                    where: {
                        slug: slugPostContentDetail,
                    },
                });
            if (!getIdPostContentDetail) {
                return responseApi(res, [], null, "Server error....", 400);
            }
            if (getIdPostContentDetail.is_accepted == 0) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Something wrong in your post, stay tune yaah :)",
                    500
                );
            }
            if (getIdPostContentDetail.is_accepted == 2) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Something wrong in your post",
                    500
                );
            }
            const checkAnyLike = await LikePostContentDetailModels.findOne({
                where: {
                    users_id: users_id,
                    post_content_details_id: getIdPostContentDetail.id,
                },
            });

            if (checkAnyLike) {
                await checkAnyLike.destroy();
            } else {
                const dataLikePost = await LikePostContentDetailModels.create(
                    {
                        users_id: users_id,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                        post_content_details_id: getIdPostContentDetail.id,
                    },
                    { transaction }
                );
                if (getIdPostContentDetail.users_id !== users_id) {
                    await generateNotificationMessage({
                        source_id: dataLikePost.id,
                        users_id: getIdPostContentDetail.users_id,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                        type: 6
                    })
                }
            }

            return responseApi(res, [], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error post", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    }
);

export const deletePostPerContentDetail = withTransaction(
    async (req, res) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const slugPostContentDetail = req.params.slugPostContentDetail;
            const getIdPostContentDetail = await PostContentDetailModels.findOne({
                where: {
                    slug: slugPostContentDetail,
                },
            });
            const checkAnyLike = await LikePostContentDetailModels.findOne({
                where: {
                    post_content_details_id: getIdPostContentDetail.id,
                },
            });
            const checkAnyComment = await CommentPostContentDetailModels.findOne({
                where: {
                    post_content_details_id: getIdPostContentDetail.id,
                },
            });
            const checkAnySegmentedPostContentDetail = await SegmentedPostContentDetailModels.findOne({
                where: {
                    post_content_details_id: getIdPostContentDetail.id,
                },
            });
            const checkAnyFilePostContentDetailModels = await FilePostContentDetailModels.findOne({
                where: {
                    post_content_details_id: getIdPostContentDetail.id,
                },
            });
            const checkAnyTopicPostRelationsModels = await TopicPostRelationsModels.findOne({
                where: {
                    post_content_details_id: getIdPostContentDetail.id,
                },
            });
            if (!getIdPostContentDetail && checkAnyLike && checkAnyComment && checkAnyTopicPostRelationsModels) {
                return responseApi(res, [], null, "Server error....", 400);
            }
            if (getIdPostContentDetail.users_id !== users_id) {
                console.log("cannot be deleted because you arent owner of this image! ")
                throw new Error("User Not Same!");
            }
            if (getIdPostContentDetail) {
                if (checkAnyFilePostContentDetailModels) {
                    if (checkAnyTopicPostRelationsModels) {
                        await checkAnyTopicPostRelationsModels.destroy();
                    }
                    if (checkAnyLike) {
                        await checkAnyLike.destroy();
                    }
                    if (checkAnyComment) {
                        await checkAnyComment.destroy();
                    }
                    if (checkAnySegmentedPostContentDetail) {
                        await checkAnySegmentedPostContentDetail.destroy();
                    }
                    await checkAnyFilePostContentDetailModels.destroy();
                    const filePath = process.env.APP_LOCATION_FILE + checkAnyFilePostContentDetailModels.file;
                    const existFile = fileExists(filePath);
                    if (existFile) {
                        await deleteFile(filePath)
                    }
                }
                await getIdPostContentDetail.destroy();
            }
            return responseApi(res, [], null, "Data has been deleted", 0);
        } catch (error) {
            console.log("error delete post", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    }
)

export const getDetailPostPerContentDetail = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const slugPostContentDetail = req.params.slugPostContentDetail;
        let whereClause = `WHERE pcds.slug = :slugPostContentDetail`;

        const replacements = {
            slugPostContentDetail: slugPostContentDetail,
        };

        const query = `
            SELECT
                pcds.users_id,
                pcds.caption_post AS caption,
                pcds.slug,
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_like_post_content_details l
                        WHERE l.post_content_details_id = pcds.id
                        AND l.users_id = ${users_id}
                    )
                ) AS post_liked,
                CAST(
                    (
                        SELECT COUNT(*)
                        FROM ir_impression_post_content_details ipcds
                        WHERE ipcds.post_content_details_id = pcds.id
                    ) AS INT
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
                TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'verified', CASE 
                        WHEN u.is_verified = 1 THEN true
                        ELSE false END,
                    'username', u.username
                ) AS user,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'image', fpcds.file
                        )
                    ), '[]') AS members
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images,
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
                LEFT JOIN ir_users u ON pcds.users_id = u.id
            ${whereClause}
        `;

        const executeQuery = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });

        const getIdPostContentDetail = await PostContentDetailModels.findOne({
            where: {
                slug: slugPostContentDetail,
            },
        });
        if (!getIdPostContentDetail) {
            return responseApi(res, [], null, "Server error....", 400);
        }
        const getAnyImpressionPostContentDetailModels = await ImpressionPostContentDetailModels.findOne({
            where: {
                users_id: users_id,
                post_content_details_id: getIdPostContentDetail.id,
            },
        });
        if (Number(users_id) > 0) {
            if (!getAnyImpressionPostContentDetailModels) {
                ImpressionPostContentDetailModels.create({
                    users_id: users_id,
                    post_content_details_id: getIdPostContentDetail.id,
                });
            }
        }

        return responseApi(
            res,
            executeQuery,
            null,
            "Data has been retrived",
            0
        );
    } catch (error) {
        console.log("error get detail post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const getDetailPostPerContentDetailPerTopic = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const topicTitle = req.params.topicTitle;
        let whereClause = `WHERE itp.text_title = :topicTitle`;

        const replacements = {
            topicTitle: topicTitle,
            limit: limit,
            offset: offset
        };

        const query = `
                 SELECT
                pcds.users_id,
                pcds.caption_post AS caption,
                pcds.slug,
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_like_post_content_details l
                        WHERE l.post_content_details_id = pcds.id
                        AND l.users_id = ${users_id}
                    )
                ) AS post_liked,
                CAST(
                    (
                        SELECT COUNT(*)
                        FROM ir_impression_post_content_details ipcds
                        WHERE ipcds.post_content_details_id = pcds.id
                    ) AS INT
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
                TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'verified', CASE 
                        WHEN u.is_verified = 1 THEN true
                        ELSE false END,
                    'username', u.username
                ) AS user,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'image', fpcds.file
                        )
                    ), '[]') AS members
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images
            FROM
                ir_post_content_details pcds
                LEFT JOIN ir_users u ON pcds.users_id = u.id
                LEFT JOIN ir_topic_post_relations itpr ON itpr.post_content_details_id = pcds.id
                JOIN ir_topic_posts itp ON itp.id = itpr.topic_posts_id
            ${whereClause}
            ORDER BY pcds.id DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details pcds
            LEFT JOIN ir_topic_post_relations itpr ON itpr.post_content_details_id = pcds.id
            JOIN ir_topic_posts itp ON itp.id = itpr.topic_posts_id
            WHERE type = 0 AND itp.text_title = :topicTitle
        `;

        const totalResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const total = parseInt(totalResult[0]?.total_count || 0, 10);
        const totalPages = Math.ceil(total / limit);

        return responseApi(
            res,
            data,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.log("error get detail post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
export const getPostPerUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const usernameUser = req.params.username;
        const getDataUsersModels = await UsersModels.findOne({
            where: {
                username: usernameUser,
            },
        });
        if (!getDataUsersModels) {
            return responseApi(res, [], null, "User not found", 1);
        }
        const users_id = getDataUsersModels.id;

        const replacements = {
            users_id,
            limit,
            offset,
        };

        const query = `
            SELECT
                pcds.users_id,
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
                TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'verified', CASE 
                        WHEN u.is_verified = 1 THEN true
                        ELSE false END,
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
                        AND l.users_id = :users_id
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
                pcds.users_id = :users_id AND pcds.type = 0
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset;
        `;
        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details
            WHERE users_id = :users_id AND type = 0
        `;

        const totalResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const total = parseInt(totalResult[0]?.total_count || 0, 10);
        const totalPages = Math.ceil(total / limit);

        return responseApi(
            res,
            data,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.error("Error getCommentMomentContentDetail:", error.message);
        return responseApi(res, [], null, "Internal server error", 1);
    }

}

export const deleteCommentPost = withTransaction(
    async (req, res) => {
        try {
            const { comment_id } = req.query;
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const checkAnyComment = await CommentPostContentDetailModels.findOne({
                where: {
                    id: comment_id,
                },
            });
            if (!checkAnyComment) {
                return responseApi(res, [], null, "Server error....", 400);
            }
            if (checkAnyComment.users_id !== users_id) {
                console.log("cannot be deleted because you arent owner of this image! ")
                throw new Error("User Not Same!");
            }
            if (checkAnyComment) {
                await checkAnyComment.destroy();
            }
            return responseApi(res, [], null, "Data has been deleted", 0);
        } catch (error) {
            console.log("error delete post", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    }
)