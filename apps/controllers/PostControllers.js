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
import SegmentedPostContentDetailModels from "../models/SegmentedPostContentDetailModels.js";

export const getPost = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1 , limit = 10} = req.query;
        const offset = (page - 1) * limit;
        const { event_slug } = req.body;

        let whereClause = "";

        let replacements = {
            usersId: users_id,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        if (typeof event_slug !== "undefined") {
            whereClause += ` WHERE cds.slug = :slugContentDetail`;
            replacements.slugContentDetail = event_slug;
        }

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
                    ), '[]') AS members
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images,
                CASE 
                    WHEN lpcds.id IS NOT NULL AND lpcds.users_id = 24 THEN TRUE
                    ELSE FALSE
                END AS post_liked
            FROM
                ir_post_content_details pcds
                LEFT JOIN ir_segmented_post_content_details spcds ON pcds.ID = spcds.post_content_details_id
	            LEFT JOIN ir_content_details cds ON spcds.content_details_id = cds.id
                LEFT JOIN ir_users u ON pcds.users_id = u.id
                LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
                LEFT JOIN ir_like_post_content_details lpcds ON lpcds.post_content_details_id = pcds.id
            ${whereClause}
            LIMIT :limit OFFSET :offset;
        `;
        const executeQuery = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        console.log("replacements", replacements);
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM
                ir_post_content_details pcds
                LEFT JOIN ir_segmented_post_content_details spcds ON pcds.ID = spcds.post_content_details_id
	            LEFT JOIN ir_content_details cds ON spcds.content_details_id = cds.id
                LEFT JOIN ir_users u ON pcds.users_id = u.id
                LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
            ${whereClause}
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
                assets_image_url: process.env.APP_BUCKET_IMAGE,
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
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const likePostPerContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const slugPostContentDetail = req.params.slugPostContentDetail;
            const getIdPostContentDetail =
                await PostContentDetailModels.findOne({
                    where: {
                        slug: slugPostContentDetail,
                    },
                });
            if (!getIdPostContentDetail) {
                return responseApi(res, [], null, "Server error....", 400);
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
                await LikePostContentDetailModels.create(
                    {
                        users_id: users_id,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                        post_content_details_id: getIdPostContentDetail.id,
                    },
                    { transaction }
                );
            }

            return responseApi(res, [], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error post", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    }
);

export const commentPostPerContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const { comment_post } = req.body;
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const slugPostContentDetail = req.params.slugPostContentDetail;
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
            if (comment_post.length > 100) {
                return responseApi(res, [], null, "Comment to long", 400);
            }
            await CommentPostContentDetailModels.create(
                {
                    users_id: users_id,
                    post_content_details_id: getIdPostContentDetail.id,
                    comment_post: comment_post,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
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
                pcds.caption_post AS caption,
                pcds.slug,
                cds.title AS event_name,
                cds.slug AS event_slug,
                CASE 
                    WHEN cds.is_trending = 0 THEN 'ended'
                    WHEN cds.is_trending = 1 THEN 'ongoing'
                    ELSE 'upcoming' 
                END AS event_status,
                CASE 
                    WHEN lpcds.id IS NOT NULL AND lpcds.users_id = 24 THEN TRUE
                    ELSE FALSE
                END AS post_liked,
                CASE 
                    WHEN pcds.type = 0 THEN 'global'
                    WHEN cds.is_trending = 1 THEN 'event'
                    ELSE 'ticket' 
                END AS event_type,
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
                LEFT JOIN ir_segmented_post_content_details spcds ON pcds.ID = spcds.post_content_details_id
	            LEFT JOIN ir_content_details cds ON spcds.content_details_id = cds.id
                LEFT JOIN ir_users u ON pcds.users_id = u.id
                LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
                LEFT JOIN ir_like_post_content_details lpcds ON lpcds.post_content_details_id = pcds.id
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
        ImpressionPostContentDetailModels.create({
            users_id: users_id,
            post_content_details_id: getIdPostContentDetail.id,
        });
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

export const createPostContentDetail = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const { caption_post, event_slug, post_type } = req.body;
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
                console.log("filesNamed", filesNamed);
            }

            if (caption_post.length > 100) {
                return responseApi(res, [], null, "Caption to long", 400);
            }
            if (Number(post_type) == 2 && typeof event_slug === "undefined") {
                throw new Error("Data wrong because event slug not valid!");
            }
            const data = {
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                caption_post: caption_post,
                slug: btoa(dateToEpochTime(req.headers["x-date-for"])),
                users_id: users_id,
                type: post_type,
            };
            const dataPost = await PostContentDetailModels.create(data, {
                transaction,
            });
            await FilePostContentDetailModels.create(
                {
                    post_content_details_id: dataPost.id,
                    file: filesNamed,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                },
                { transaction }
            );
            if (typeof event_slug !== "undefined") {
                if (Number(post_type) == 0) {
                    console.log("Data wrong because event slug not valid!");
                    throw new Error("Data wrong because event slug not valid!");
                }
                const getIdContentDetail = await ContentDetailsModels.findOne({
                    where: {
                        slug: event_slug,
                    },
                });
                if (!getIdContentDetail) {
                    throw new Error("Content detail not found!");
                }
                await SegmentedPostContentDetailModels.create(
                    {
                        post_content_details_id: dataPost.id,
                        users_id: users_id,
                        content_details_id: getIdContentDetail.id,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                    },
                    { transaction }
                );
            }

            if (file) {
                const fileDestination =
                    process.env.APP_LOCATION_FILE + filesNamed;
                await uploadFile(file, fileDestination);
                console.log("filesNamed", filesNamed);
            }
            return responseApi(res, [], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error post", error);
            throw error;
        }
    }
);

export const commentGetPerContentDetail = async (req, res) => {
    try {
        const slugPostContentDetail = req.params.slugPostContentDetail;
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
            SELECT cpcds.comment_post,
                json_build_object(
                        'name', u.display_name,
                        'image', u.photo,
                        'username', u.username
                ) AS user,
            TO_CHAR(TO_TIMESTAMP(cpcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at
            FROM 
            ir_comment_post_content_details cpcds 
            LEFT JOIN ir_post_content_details pcds ON cpcds.post_content_details_id = pcds.id
            LEFT JOIN ir_users u ON cpcds.users_id = u.id
            ${whereClause}
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
        console.log("error get detail post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
