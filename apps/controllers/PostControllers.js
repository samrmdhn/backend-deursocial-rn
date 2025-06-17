import {
    createNameFile,
    dateToEpochTime,
    getDataUserUsingToken,
    getExtension,
    isMoreThanOneMonthFromTimestamp,
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
import { deleteFile, uploadFile } from "../../helpers/FileUpload.js";
import SegmentedPostContentDetailModels from "../models/SegmentedPostContentDetailModels.js";
import UsersModels from "../models/UsersModels.js";
import { generateNotificationMessage } from "../../helpers/notification.js";
import { Sequelize } from "sequelize";
const Op = Sequelize.Op;

export const getPost = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const { event_slug } = req.query;
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
                        type: 2
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
                TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
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
            const commentPostData = await CommentPostContentDetailModels.create(
                {
                    users_id: users_id,
                    post_content_details_id: getIdPostContentDetail.id,
                    comment_post: comment_post,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                },
                { transaction }
            );
            if (getIdPostContentDetail.users_id !== users_id) {
                await generateNotificationMessage({
                    source_id: commentPostData.id,
                    users_id: getIdPostContentDetail.users_id,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                    type: 3
                })
            }
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
            const xDateFor = req.headers["x-date-for"];
            const userDate = new Date(xDateFor);
            if (isNaN(userDate.getTime())) {
                return responseApi(res, [], null, "Whats wrong dude? jajajajaja", 400);
            }

            const startOfDay = new Date(userDate.getFullYear(), userDate.getMonth(), userDate.getDate()).getTime() / 1000;
            const endOfDay = startOfDay + 86400 - 1;

            const jumlahPostHariIni = await PostContentDetailModels.count({
                where: {
                    users_id: users_id,
                    created_at: {
                        [Op.between]: [startOfDay, endOfDay],
                    },
                },
            });
            if (jumlahPostHariIni >= 5) {
                return responseApi(res, [], null, "Kamu sudah mencapai batas menyimpan momentmu hari ini", 429);
            }

            const { caption_post, event_slug, post_type } = req.body;
            const getIdContentDetail = await ContentDetailsModels.findOne({
                where: {
                    slug: event_slug,
                },
            });
            if (!getIdContentDetail) {
                throw new Error("Event not found!");
            }
            if (isMoreThanOneMonthFromTimestamp(getIdContentDetail.date_end)) {
                return responseApi(res, [], null, "Opsss.....!, jajajajaja", 1);
            }

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
                    throw new Error("Event not found!");
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
                if (checkAnySegmentedPostContentDetail) {
                    await checkAnySegmentedPostContentDetail.destroy();
                }
                if (checkAnyFilePostContentDetailModels) {
                    await checkAnyFilePostContentDetailModels.destroy();
                    await deleteFile(process.env.APP_LOCATION_FILE + checkAnyFilePostContentDetailModels.file)
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
            ORDER BY pcds.id DESC
            LIMIT :limit OFFSET :offset
        `;
        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details
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
        const getToken = await getDataUserUsingToken(req, res);

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const usernameUser = req.params.username;

        const targetUser = await UsersModels.findOne({
            where: { username: usernameUser },
        });

        if (!targetUser) {
            return responseApi(res, [], null, "User not found", 1);
        }

        const isOwner = Number(targetUser.id) === Number(getToken.tod);
        const users_id = targetUser.id;

        const replacements = {
            users_id,
            viewer_id: getToken.tod,
            limit,
            offset,
        };

        const query = `
            SELECT 
                u.id,
                u.display_name,
                u.username,
                u.photo AS image,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM ir_following_users ifs
                        WHERE ifs.following_id = :viewer_id AND ifs.users_id = u.id
                    ) THEN true
                    ELSE false
                END AS followed_user
            FROM ir_following_users f
            JOIN ir_users u ON u.id = f.following_id
            WHERE f.users_id = :users_id
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
            data.map(user => ({
                ...user,
                image: user.image ? process.env.APP_BUCKET_IMAGE + user.image : null,
            })),
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

export const getFollowingOnProfile = async (req, res) => {
    try {
        const getToken = await getDataUserUsingToken(req, res);

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const usernameUser = req.params.username;

        const targetUser = await UsersModels.findOne({
            where: { username: usernameUser },
        });

        if (!targetUser) {
            return responseApi(res, [], null, "User not found", 1);
        }

        const isOwner = Number(targetUser.id) === Number(getToken.tod);
        const users_id = targetUser.id;

        const replacements = {
            users_id,
            viewer_id: getToken.tod,
            limit,
            offset,
        };

        const query = `
            SELECT 
                u.id,
                u.display_name,
                u.username,
                u.photo AS image,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM ir_following_users ifs
                        WHERE ifs.users_id = :viewer_id AND ifs.following_id = u.id
                    ) THEN true
                    ELSE false
                END AS followed_user
            FROM ir_following_users f
            JOIN ir_users u ON u.id = f.users_id
            WHERE f.following_id = :users_id
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_following_users
            WHERE following_id = :users_id
        `;

        const totalResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const total = parseInt(totalResult[0]?.total_count || 0, 10);
        const totalPages = Math.ceil(total / limit);

        return responseApi(
            res,
            data.map(user => ({
                ...user,
                image: user.image ? process.env.APP_BUCKET_IMAGE + user.image : null,
            })),
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

export const getFollowingEventOnProfile = async (req, res) => {
    try {
        const getToken = await getDataUserUsingToken(req, res);

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const usernameUser = req.params.username;

        const targetUser = await UsersModels.findOne({
            where: { username: usernameUser },
        });

        if (!targetUser) {
            return responseApi(res, [], null, "User not found", 1);
        }

        const users_id = targetUser.id;

        const replacements = {
            users_id,
            limit,
            offset,
        };

        const query = `
            SELECT 
                cd.title AS title,
                cd.slug AS slug,
                TO_CHAR( TO_TIMESTAMP( cd.schedule_start ), 'YYYY-MM-DD HH24:MI:SS' ) AS schedule_start,
                TO_CHAR( TO_TIMESTAMP( cd.schedule_end ), 'YYYY-MM-DD HH24:MI:SS' ) AS schedule_end,
                TO_CHAR( TO_TIMESTAMP( cd.date_start ), 'YYYY-MM-DD HH24:MI:SS' ) AS date_start,
                TO_CHAR( TO_TIMESTAMP( cd.date_end ), 'YYYY-MM-DD HH24:MI:SS' ) AS date_end,
                cd.description AS description,
                cd.image AS image,
            CASE    
                 WHEN cd.is_trending = 1 THEN
                TRUE ELSE FALSE 
                END AS is_trending,
            CASE  
                    WHEN cd.status = 0 THEN
                    'ended' 
                    WHEN cd.status = 1 THEN
                    'ongoing' ELSE 'upcoming' 
                END AS status,
                json_build_object(
                    'id', tcd.id,
                    'name', tcd.name
                ) AS type_content_details,
                json_build_object(
                    'id', eo.id,
                    'name', eo.name,
                    'image', eo.image
                ) AS event_organizers,
                ( SELECT COUNT ( * ) FROM ir_content_detail_followers cdf WHERE cdf.content_details_id = cd.id AND cdf.users_id = :users_id ) AS followers_count,
                ( SELECT COUNT ( * ) FROM ir_segmented_post_content_details gp WHERE gp.content_details_id = cd.id ) AS total_posts,
                ( SELECT COUNT ( * ) FROM ir_groups G WHERE G.content_details_id = cd.id ) AS total_groups,
                (
                    SELECT json_build_object(
                        'total_followers', COUNT(*),
                        'users', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', u.id,
                                    'display_name', u.display_name,
                                    'image', u.photo
                                )
                            )
                            FROM ir_content_detail_followers cdf
                            JOIN ir_users u ON cdf.users_id = u.id
                            WHERE cdf.content_details_id = cd.id
                            LIMIT 3
                        )
                    )
                    FROM ir_content_detail_followers cdf
                    WHERE cdf.content_details_id = cd.id
                ) AS followers,
                json_build_object(
                    'region', json_build_object(
                        'id', co.id,
                        'name', co.title
                    ),
                    'city', json_build_object(
                        'id', ci.id,
                        'name', ci.title
                    ),
                    'venue', json_build_object(
                        'id', v.id,
                        'name', v.title
                    )
                ) as location
            FROM
                ir_content_detail_followers cdf
                JOIN ir_content_details cd ON cd.id = cdf.content_details_id
                JOIN ir_contents C ON C.id = cd.contents_id
                JOIN ir_display_types dt ON C.display_types_id = dt.id 
                JOIN ir_type_content_details tcd ON cd.type_content_details_id = tcd.id 
                JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id 
                JOIN ir_vanues v ON cd.vanues_id = v.id 
                JOIN ir_citys ci ON v.citys_id = ci.id 
                JOIN ir_provinces p ON v.provinces_id = p.id 
                JOIN ir_countries co ON v.countries_id = co.id 
            WHERE
                cdf.users_id = :users_id 
            ORDER BY
                c.id
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM
                ir_content_detail_followers cdf
            WHERE cdf.users_id = :users_id;
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


