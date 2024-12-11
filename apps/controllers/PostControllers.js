import {
    createNameFile,
    dateToEpochTime,
    getDataUserUsingToken,
    getExtension,
    makeRandomString,
    withTransaction,
} from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import FilePostContentDetailModels from "../models/FilePostContentDetailModels.js";
import LikePostContentDetailModels from "../models/LikePostContentDetailModels.js";
import ImpressionPostContentDetailModels from "../models/ImpressionPostContentDetailModels.js";
import CommentPostContentDetailModels from "../models/CommentPostContentDetailModels.js";
import PostContentDetailModels from "../models/PostContentDetailModels.js";
import db from "../../configs/Database.js";
import { uploadFile } from "../../helpers/FileUpload.js";


export const getPostPerContentDetail = async(req, res) => {
    try {
        const { page = 1} = req.query;
        const slugContentDetail = req.params.slugContentDetail;
        const limit = 10;
        const offset = (page - 1) * limit;
        let whereClause = `WHERE cds.slug = :slugContentDetail`;
        const replacements = {
            slugContentDetail: slugContentDetail,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        const query = `
            SELECT
                pcds.caption_post AS caption,
                pcds.slug,
                cds.title AS event_name,
                cds.slug AS event_slug,
                CASE 
                    WHEN cds.is_trending = 0 THEN 'ended'
                    WHEN cds.is_trending = 1 THEN 'ongoing'
                    ELSE 'upcoming' 
                END AS event_status,
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
                    ), '[]') AS members
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images
            FROM
                ir_post_content_details pcds
                LEFT JOIN ir_content_details cds ON pcds.content_details_id = cds.id
                LEFT JOIN ir_users u ON pcds.users_id = u.id
                LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
            ${whereClause}
        `;
        const executeQuery = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        return responseApi(res, executeQuery, null, "Data has been retrived", 0);
    } catch (error) {
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const likePostPerContentDetail = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const slugPostContentDetail = req.params.slugPostContentDetail;
        const getIdPostContentDetail = await PostContentDetailModels.findOne({
            where: {
                slug: slugPostContentDetail,
            },
        });
        if (!getIdPostContentDetail) {
            return responseApi(res, [], null, "Server error....", 400);
        }
        await LikePostContentDetailModels.create(
            {
                users_id: users_id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                post_content_details_id: getIdPostContentDetail.id,
            },
            { transaction }
        );
        return responseApi(res, [], null, "Data has been saved", 0);
    } catch (error) {
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
});

export const commentPostPerContentDetail = withTransaction(async (req, res, transaction) => {
    try {
        const { comment_post } = req.body;
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const slugPostContentDetail = req.params.slugPostContentDetail;
        const getIdPostContentDetail = await PostContentDetailModels.findOne({
            where: {
                slug: slugPostContentDetail,
            },
        });
        if (!getIdPostContentDetail) {
            return responseApi(res, [], null, "Server error....", 400);
        }
        if (comment_post.length > 100) {
            return responseApi(res, [], null, "Comment to long", 400);
        }
        await CommentPostContentDetailModels.create(
            {
                users_id: users_id,
                post_content_details_id: getIdPostContentDetail.id,
                comment_post: comment_post,
                created_at: dateToEpochTime(req.headers["x-date-for"])
            },
            { transaction }
        );
        return responseApi(res, [], null, "Data has been saved", 0);
    } catch (error) {
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
});

export const getDetailPostPerContentDetail = async (req, res, transaction) => {
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
                pcds.caption_post AS caption,
                pcds.slug,
                cds.title AS event_name,
                cds.slug AS event_slug,
                CASE 
                    WHEN cds.is_trending = 0 THEN 'ended'
                    WHEN cds.is_trending = 1 THEN 'ongoing'
                    ELSE 'upcoming' 
                END AS event_status,
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
                    ), '[]') AS members
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images
            FROM
                ir_post_content_details pcds
                LEFT JOIN ir_content_details cds ON pcds.content_details_id = cds.id
                LEFT JOIN ir_users u ON pcds.users_id = u.id
                LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
            ${whereClause}
        `;
        const executeQuery = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true
        });

        const getIdPostContentDetail = await PostContentDetailModels.findOne({
            where: {
                slug: slugPostContentDetail,
            },
        });
        if (!getIdPostContentDetail) {
            return responseApi(res, [], null, "Server error....", 400);
        }
        ImpressionPostContentDetailModels.create({
            users_id: users_id,
            post_content_details_id: getIdPostContentDetail.id
        })
        return responseApi(res, executeQuery, null, "Data has been retrived", 0);
    } catch (error) {
        console.log("error get detail post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const createPostContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const { caption_post } = req.body;
            const slugContentDetail = req.params.slugContentDetail;
            const file = req.files && req.files.image;
            let filesNamed = "";
            if (file) {
                const fileDate = new Date();
                filesNamed = fileDate.getTime() + getExtension(file.name);
                filesNamed = createNameFile(filesNamed);
                if (
                    getExtension(file.name) !== ".jpg" &&
                    getExtension(file.name) !== ".png"
                ) {
                    return responseApi(res, [], null, "Image not valid", 400);
                }
                const fileDestination =
                process.env.APP_LOCATION_FILE + filesNamed;
                await uploadFile(file, fileDestination);
                console.log("filesNamed", filesNamed)
            }
            const getIdContentDetail = await ContentDetailsModels.findOne({
                where: {
                    slug: slugContentDetail,
                },
            });
            if (!getIdContentDetail) {
                return responseApi(res, [], null, "Server error....", 400);
            }
            if (caption_post.length > 100) {
                return responseApi(res, [], null, "Caption to long", 400);
            }
            const data = {
                content_details_id: getIdContentDetail.id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                caption_post: caption_post,
                slug: makeRandomString(30),
                users_id: users_id,
            };
            const dataPost = await PostContentDetailModels.create(data, {
                transaction,
            });
            await FilePostContentDetailModels.create(
                {
                    post_content_details_id: dataPost.id,
                    file: filesNamed,
                },
                { transaction }
            );
            return responseApi(res, [], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error post", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    }
);
