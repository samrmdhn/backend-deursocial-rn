import { dateToEpochTime, escapeHtmlForXss, getDataUserUsingToken, makeRandomString, withTransaction } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import { parseToRichText } from "../../libs/ParseToRichText.js";
import { generateNotificationMessage } from "../../helpers/notification.js";
import db from "../../configs/Database.js";
import EventPostsModels from "../models/EventPostsModels.js";
import EventPostsCommentsModels from "../models/EventPostsCommentsModels.js";
import EventPostsLikesModels from "../models/EventPostsLikesModels.js";
import EventPostsImagesModels from "../models/EventPostsImagesModels.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";

/**
 * GET /api/event/posts/:eventSlug
 * Get community posts (post_type=0) for an event
 * Query: page, limit, filter (latest|popular)
 */
export const getEventPosts = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const eventSlug = req.params.eventSlug;
        const { page = 1, limit = 10, filter = "latest" } = req.query;
        const offset = (page - 1) * limit;

        const event = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
        if (!event) {
            return responseApi(res, [], null, "Event not found", 400);
        }

        let orderClause = "ORDER BY ep.created_at DESC";
        if (filter === "popular") {
            orderClause = "ORDER BY total_likes DESC, ep.created_at DESC";
        }

        const replacements = {
            contentDetailsId: event.id,
            usersId: users_id,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };

        const query = `
            SELECT
                ep.id,
                ep.caption,
                ep.caption_raw,
                ep.slug,
                ep.post_type,
                (
                    SELECT COUNT(*)
                    FROM ir_event_posts_likes epl
                    WHERE epl.event_posts_id = ep.id
                ) AS total_likes,
                (
                    SELECT COUNT(*)
                    FROM ir_event_posts_comments epc
                    WHERE epc.event_posts_id = ep.id
                ) AS total_comments,
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_event_posts_likes l
                        WHERE l.event_posts_id = ep.id
                        AND l.users_id = :usersId
                    )
                ) AS is_liked,
                TO_CHAR(TO_TIMESTAMP(ep.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
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
                            'id', epi.id,
                            'image_url', epi.image_url
                        )
                    ), '[]')
                    FROM ir_event_posts_images epi
                    WHERE epi.event_posts_id = ep.id
                ) AS images
            FROM
                ir_event_posts ep
                JOIN ir_users u ON ep.users_id = u.id
            WHERE
                ep.content_details_id = :contentDetailsId
                AND ep.is_accepted = 1
                AND ep.post_type = 0
            ${orderClause}
            LIMIT :limit OFFSET :offset;
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_event_posts ep
            WHERE ep.content_details_id = :contentDetailsId
                AND ep.is_accepted = 1
                AND ep.post_type = 0
        `;
        const totalCountResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const totalCount = parseInt(totalCountResult[0].total_count, 10);
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            data,
            {
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
        console.log("error getEventPosts", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * GET /api/event/official-posts/:eventSlug
 * Get official/EO posts (post_type=1) for an event
 */
export const getEventOfficialPosts = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const eventSlug = req.params.eventSlug;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const event = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
        if (!event) {
            return responseApi(res, [], null, "Event not found", 400);
        }

        const replacements = {
            contentDetailsId: event.id,
            usersId: users_id,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };

        const query = `
            SELECT
                ep.id,
                ep.caption,
                ep.caption_raw,
                ep.slug,
                ep.post_type,
                (
                    SELECT COUNT(*)
                    FROM ir_event_posts_likes epl
                    WHERE epl.event_posts_id = ep.id
                ) AS total_likes,
                (
                    SELECT COUNT(*)
                    FROM ir_event_posts_comments epc
                    WHERE epc.event_posts_id = ep.id
                ) AS total_comments,
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_event_posts_likes l
                        WHERE l.event_posts_id = ep.id
                        AND l.users_id = :usersId
                    )
                ) AS is_liked,
                TO_CHAR(TO_TIMESTAMP(ep.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
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
                            'id', epi.id,
                            'image_url', epi.image_url
                        )
                    ), '[]')
                    FROM ir_event_posts_images epi
                    WHERE epi.event_posts_id = ep.id
                ) AS images,
                json_build_object(
                    'name', eo.name,
                    'image', eo.image
                ) AS event_organizer
            FROM
                ir_event_posts ep
                JOIN ir_users u ON ep.users_id = u.id
                JOIN ir_content_details cd ON ep.content_details_id = cd.id
                LEFT JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id
            WHERE
                ep.content_details_id = :contentDetailsId
                AND ep.is_accepted = 1
                AND ep.post_type = 1
            ORDER BY ep.created_at DESC
            LIMIT :limit OFFSET :offset;
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_event_posts ep
            WHERE ep.content_details_id = :contentDetailsId
                AND ep.is_accepted = 1
                AND ep.post_type = 1
        `;
        const totalCountResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const totalCount = parseInt(totalCountResult[0].total_count, 10);
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            data,
            {
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
        console.log("error getEventOfficialPosts", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * POST /api/event/posts/:eventSlug
 * Create a community post (post_type=0) by user
 * Body: caption, image_urls (array of Supabase URLs)
 */
export const createEventPost = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id == 0) {
                return responseApi(res, [], null, "Login needed", 400);
            }

            const eventSlug = req.params.eventSlug;
            const { caption, image_urls } = req.body;

            if (!caption || caption.trim().length === 0) {
                return responseApi(res, [], null, "Caption is required", 418);
            }
            if (caption.length > 500) {
                return responseApi(res, [], null, "Caption too long", 418);
            }

            const event = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
            if (!event) {
                return responseApi(res, [], null, "Event not found", 400);
            }

            const slug = btoa(dateToEpochTime(req.headers["x-date-for"]) + "-" + makeRandomString(5));

            const post = await EventPostsModels.create({
                caption: parseToRichText(caption),
                caption_raw: caption,
                slug,
                content_details_id: event.id,
                users_id,
                post_type: 0,
                is_accepted: 1,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }, { transaction });

            // Save image URLs (from Supabase)
            if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
                for (const url of image_urls) {
                    await EventPostsImagesModels.create({
                        event_posts_id: post.id,
                        image_url: url,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                    }, { transaction });
                }
            }

            return responseApi(res, [{ post_slug: post.slug }], null, "Post created successfully", 0);
        } catch (error) {
            console.log("error createEventPost", error);
            throw error;
        }
    }
);

/**
 * POST /api/event/official-posts/:eventSlug
 * Create an official post (post_type=1) by EO
 * Body: caption, image_urls
 */
export const createEventOfficialPost = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id == 0) {
                return responseApi(res, [], null, "Login needed", 400);
            }

            const eventSlug = req.params.eventSlug;
            const { caption, image_urls } = req.body;

            if (!caption || caption.trim().length === 0) {
                return responseApi(res, [], null, "Caption is required", 418);
            }
            if (caption.length > 1000) {
                return responseApi(res, [], null, "Caption too long", 418);
            }

            const event = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
            if (!event) {
                return responseApi(res, [], null, "Event not found", 400);
            }

            const slug = btoa(dateToEpochTime(req.headers["x-date-for"]) + "-" + makeRandomString(5));

            const post = await EventPostsModels.create({
                caption: parseToRichText(caption),
                caption_raw: caption,
                slug,
                content_details_id: event.id,
                users_id,
                post_type: 1,
                is_accepted: 1,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }, { transaction });

            if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
                for (const url of image_urls) {
                    await EventPostsImagesModels.create({
                        event_posts_id: post.id,
                        image_url: url,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                    }, { transaction });
                }
            }

            return responseApi(res, [{ post_slug: post.slug }], null, "Official post created successfully", 0);
        } catch (error) {
            console.log("error createEventOfficialPost", error);
            throw error;
        }
    }
);

/**
 * GET /api/event/post/detail/:slug
 * Get detail of a single event post
 */
export const getEventPostDetail = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const slug = req.params.slug;

        const replacements = { slug, usersId: users_id };

        const query = `
            SELECT
                ep.id,
                ep.caption,
                ep.caption_raw,
                ep.slug,
                ep.post_type,
                (
                    SELECT COUNT(*)
                    FROM ir_event_posts_likes epl
                    WHERE epl.event_posts_id = ep.id
                ) AS total_likes,
                (
                    SELECT COUNT(*)
                    FROM ir_event_posts_comments epc
                    WHERE epc.event_posts_id = ep.id
                ) AS total_comments,
                (
                    SELECT EXISTS (
                        SELECT 1
                        FROM ir_event_posts_likes l
                        WHERE l.event_posts_id = ep.id
                        AND l.users_id = :usersId
                    )
                ) AS is_liked,
                TO_CHAR(TO_TIMESTAMP(ep.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
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
                            'id', epi.id,
                            'image_url', epi.image_url
                        )
                    ), '[]')
                    FROM ir_event_posts_images epi
                    WHERE epi.event_posts_id = ep.id
                ) AS images,
                json_build_object(
                    'slug', cd.slug,
                    'title', cd.title
                ) AS event
            FROM
                ir_event_posts ep
                JOIN ir_users u ON ep.users_id = u.id
                JOIN ir_content_details cd ON ep.content_details_id = cd.id
            WHERE
                ep.slug = :slug
                AND ep.is_accepted = 1
        `;

        const data = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });

        if (!data) {
            return responseApi(res, [], null, "Post not found", 400);
        }

        return responseApi(res, data, null, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getEventPostDetail", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * POST /api/event/post/like/:slug
 * Toggle like on an event post
 */
export const likeEventPost = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id === 0) {
                return responseApi(res, [], null, "Login needed", 418);
            }

            const slug = req.params.slug;
            const post = await EventPostsModels.findOne({ where: { slug } });
            if (!post) {
                return responseApi(res, [], null, "Post not found", 400);
            }
            if (post.is_accepted !== 1) {
                return responseApi(res, [], null, "Post not available", 400);
            }

            const existingLike = await EventPostsLikesModels.findOne({
                where: { users_id, event_posts_id: post.id },
            });

            if (existingLike) {
                await existingLike.destroy();
            } else {
                const likeData = await EventPostsLikesModels.create({
                    users_id,
                    event_posts_id: post.id,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                }, { transaction });

                if (post.users_id !== users_id) {
                    await generateNotificationMessage({
                        source_id: likeData.id,
                        users_id: post.users_id,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                        type: 10
                    });
                }
            }

            return responseApi(res, [], null, "Data has been saved", 0);
        } catch (error) {
            console.log("error likeEventPost", error);
            throw error;
        }
    }
);

/**
 * POST /api/event/post/comment/:slug
 * Add comment to an event post
 * Body: comment
 */
export const commentEventPost = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id === 0) {
                return responseApi(res, [], null, "Login needed", 418);
            }

            const { comment } = req.body;
            if (!comment || comment.trim().length === 0) {
                return responseApi(res, [], null, "Comment is required", 418);
            }
            if (comment.length > 200) {
                return responseApi(res, [], null, "Comment too long", 418);
            }

            const slug = req.params.slug;
            const post = await EventPostsModels.findOne({ where: { slug } });
            if (!post) {
                return responseApi(res, [], null, "Post not found", 400);
            }
            if (post.is_accepted !== 1) {
                return responseApi(res, [], null, "Post not available", 400);
            }

            const commentData = await EventPostsCommentsModels.create({
                comment: escapeHtmlForXss(comment),
                event_posts_id: post.id,
                users_id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }, { transaction });

            if (post.users_id !== users_id) {
                await generateNotificationMessage({
                    source_id: commentData.id,
                    users_id: post.users_id,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                    type: 11
                });
            }

            return responseApi(res, [], null, "Comment added", 0);
        } catch (error) {
            console.log("error commentEventPost", error);
            throw error;
        }
    }
);

/**
 * GET /api/event/post/comments/:slug
 * Get comments for an event post
 */
export const getEventPostComments = async (req, res) => {
    try {
        const slug = req.params.slug;
        const { page = 1 } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        const replacements = {
            slug,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };

        const query = `
            SELECT
                epc.id,
                epc.comment,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'username', u.username,
                    'verified', CASE
                        WHEN u.is_verified = 1 THEN true
                        ELSE false END
                ) AS user,
                TO_CHAR(TO_TIMESTAMP(epc.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at
            FROM
                ir_event_posts_comments epc
                LEFT JOIN ir_event_posts ep ON epc.event_posts_id = ep.id
                LEFT JOIN ir_users u ON epc.users_id = u.id
            WHERE ep.slug = :slug
            ORDER BY epc.created_at DESC
            LIMIT :limit OFFSET :offset;
        `;

        const data = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_event_posts_comments epc
            LEFT JOIN ir_event_posts ep ON epc.event_posts_id = ep.id
            WHERE ep.slug = :slug
        `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = parseInt(totalCountResult[0].total_count, 10);
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            data,
            {
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
        console.log("error getEventPostComments", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * DELETE /api/event/post/:slug
 * Delete an event post (only by owner)
 */
export const deleteEventPost = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;

            const slug = req.params.slug;
            const post = await EventPostsModels.findOne({ where: { slug } });
            if (!post) {
                return responseApi(res, [], null, "Post not found", 400);
            }
            if (post.users_id !== users_id) {
                return responseApi(res, [], null, "Unauthorized", 400);
            }

            // Delete related data
            await EventPostsLikesModels.destroy({ where: { event_posts_id: post.id }, transaction });
            await EventPostsCommentsModels.destroy({ where: { event_posts_id: post.id }, transaction });
            await EventPostsImagesModels.destroy({ where: { event_posts_id: post.id }, transaction });
            await post.destroy({ transaction });

            return responseApi(res, [], null, "Post deleted", 0);
        } catch (error) {
            console.log("error deleteEventPost", error);
            throw error;
        }
    }
);

/**
 * DELETE /api/event/post/comment/:commentId
 * Delete a comment (only by owner)
 */
export const deleteEventPostComment = withTransaction(
    async (req, res, transaction) => {
        try {
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            const { comment_id } = req.query;

            const comment = await EventPostsCommentsModels.findOne({ where: { id: comment_id } });
            if (!comment) {
                return responseApi(res, [], null, "Comment not found", 400);
            }
            if (comment.users_id !== users_id) {
                return responseApi(res, [], null, "Unauthorized", 400);
            }

            await comment.destroy({ transaction });
            return responseApi(res, [], null, "Comment deleted", 0);
        } catch (error) {
            console.log("error deleteEventPostComment", error);
            throw error;
        }
    }
);
