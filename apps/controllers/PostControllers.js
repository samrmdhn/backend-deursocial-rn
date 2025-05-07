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
import UsersModels from "../models/UsersModels.js";

export const getPost = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1, limit = 10 } = req.query;
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
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_like_post_content_details l
                        WHERE l.post_content_details_id = pcds.id
                        AND l.users_id = ${users_id}
                    )
                ) AS post_liked
            FROM
                ir_post_content_details pcds
                LEFT JOIN ir_segmented_post_content_details spcds ON pcds.ID = spcds.post_content_details_id
	            LEFT JOIN ir_content_details cds ON spcds.content_details_id = cds.id
                LEFT JOIN ir_users u ON pcds.users_id = u.id
            ${whereClause}
            LIMIT :limit OFFSET :offset;
        `;
        const executeQuery = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });
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


export const getLikePostContentDetail = async (req, res) => {
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
        const users_id = getDataUsersModels?.id;

        let whereClause = "WHERE lpcd.users_id = :usersId";
        let replacements = {
            usersId: users_id,
            limit: limit,
            offset: offset,
        };

        const query = `
            SELECT 
                cds.title AS event_title,
                cds.slug AS event_slug,
                pcds.caption_post AS caption,
                pcds.slug AS slug,
                TO_CHAR(TO_TIMESTAMP(pcds.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at,
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
                (
                    SELECT COUNT(*)
                    FROM ir_like_post_content_details lpcds
                    WHERE lpcds.post_content_details_id = pcds.id
                ) AS total_likes,
                (
                    SELECT COUNT(*)
                    FROM ir_comment_post_content_details cpcds
                    WHERE cpcds.post_content_details_id = pcds.id
                ) AS total_comments
            FROM ir_like_post_content_details lpcd
            JOIN ir_post_content_details pcds ON lpcd.post_content_details_id = pcds.id
            JOIN ir_users u ON pcds.users_id = u.id
            JOIN ir_segmented_post_content_details spcds ON spcds.post_content_details_id = pcds.id
            JOIN ir_content_details cds ON cds.id = spcds.content_details_id
            ${whereClause}
            ORDER BY lpcd.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const executeQuery = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_like_post_content_details lpcd
            JOIN ir_post_content_details pcd 
                ON lpcd.post_content_details_id = pcd.id
            ${whereClause}
        `;

        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = parseInt(totalCountResult[0]?.total_count || 0, 10);
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            executeQuery,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.error("error get data like", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};




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
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_like_post_content_details l
                        WHERE l.post_content_details_id = pcds.id
                        AND l.users_id = ${users_id}
                    )
                ) AS post_liked,
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
        if (Number(users_id) > 0) {
            ImpressionPostContentDetailModels.create({
                users_id: users_id,
                post_content_details_id: getIdPostContentDetail.id,
            });
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
            return responseApi(res, [{ "post_slug": dataPost.slug }], null, "Data has been saved", 0);
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

export const deleteDetailPostPerContentDetail = withTransaction(
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
            if (!getIdPostContentDetail && checkAnyLike && checkAnyComment) {
                return responseApi(res, [], null, "Server error....", 400);
            }
            if (getIdPostContentDetail) {
                if (checkAnyLike) {
                    await checkAnyLike.destroy();
                }
                if (checkAnyComment) {
                    await checkAnyComment.destroy();
                }
                await getIdPostContentDetail.destroy();
            }
            return responseApi(res, [], null, "Data has been deleted", 0);
        } catch (error) {
            console.log("error post", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    }
)


export const getCommentPostContentDetail = async (req, res) => {
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
                cpcds.comment_post,
                pcds.slug AS post_slug,
                json_build_object(
                    'caption_post', pcds.caption_post,
                    'slug', pcds.slug,
                    'created_at', TO_CHAR(TO_TIMESTAMP(pcds.created_at), 'YYYY-MM-DD HH24:MI:SS'),
                    'user', json_build_object(
                        'id', upost.id,
                        'name', upost.display_name,
                        'username', upost.username,
                        'image', upost.photo
                    )
                ) AS user_post,
                TO_CHAR(TO_TIMESTAMP(cpcds.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                json_build_object(
                    'name', commenter.display_name,
                    'image', commenter.photo,
                    'username', commenter.username
                ) AS user
            FROM ir_comment_post_content_details cpcds
            JOIN ir_post_content_details pcds ON pcds.id = cpcds.post_content_details_id
            JOIN ir_users commenter ON cpcds.users_id = commenter.id
            JOIN ir_users upost ON pcds.users_id = upost.id
            WHERE cpcds.users_id = :users_id
            ORDER BY cpcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_comment_post_content_details
            WHERE users_id = :users_id
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
        console.error("Error getCommentPostContentDetail:", error.message);
        return responseApi(res, [], null, "Internal server error", 1);
    }
};


export const getMomentPostContentDetail = async (req, res) => {
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

        const query = `SELECT 
                pcds.slug,
                CASE 
                    WHEN pcds.type = 0 THEN 'global'
                    WHEN pcds.type = 1 THEN 'event'
                    ELSE 'ticket' 
                END AS type,
                (
                    SELECT fpcds.file
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                    ORDER BY fpcds.id ASC
                    LIMIT 1
                ) AS images
            FROM ir_post_content_details pcds
            JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
            JOIN ir_segmented_post_content_details spcds ON spcds.post_content_details_id = pcds.id
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.users_id = :users_id
            ORDER BY pcds.id ASC
            LIMIT :limit OFFSET :offset
        `;
        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_comment_post_content_details
            WHERE users_id = :users_id
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
        console.error("Error getCommentPostContentDetail:", error.message);
        return responseApi(res, [], null, "Internal server error", 1);
    }

}

export const getFollowerOnProfile = async (req, res) => {
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
                u.id,
                u.display_name,
                u.username,
                (
                    CASE 
                        WHEN EXISTS (
                            SELECT 1
                            FROM ir_following_users ifs
                            WHERE ifs.users_id = ${users_id}
                            AND ifs.following_id = u.id
                        ) THEN true
                        ELSE false
                    END
                ) AS followed_user
            FROM ir_following_users f
            JOIN ir_users u ON u.id = f.following_id
            WHERE f.users_id = :users_id
            AND f.following_id = u.id
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_following_users 
            WHERE users_id = :users_id
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
        console.error("Error getFollowerOnProfile:", error.message);
        return responseApi(res, [], null, "Internal server error", 1);
    }
};

