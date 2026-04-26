import { dateToEpochTime, getDataUserUsingToken, makeRandomString, withTransaction } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import db from "../../configs/Database.js";
import PostContentDetailModels from "../models/PostContentDetailModels.js";
import FilePostContentDetailModels from "../models/FilePostContentDetailModels.js";
import CommentPostContentDetailModels from "../models/CommentPostContentDetailModels.js";
import LikePostContentDetailModels from "../models/LikePostContentDetailModels.js";
import LikeCommentPostContentDetailModels from "../models/LikeCommentPostContentDetailModels.js";
import SegmentedPostContentDetailModels from "../models/SegmentedPostContentDetailModels.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import GroupsModels from "../models/GroupsModels.js";
import { parseToRichText } from "../../libs/ParseToRichText.js";
import { generateNotificationMessage } from "../../helpers/notification.js";
import { uploadPostImage, getPostImageUrl } from "../../helpers/StorageUpload.js";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const buildPaginationMeta = (page, limit, totalCount) => ({
    pagination: {
        current_page: parseInt(page, 10),
        per_page: parseInt(limit, 10),
        total: parseInt(totalCount, 10),
        total_page: Math.ceil(totalCount / limit),
    },
});

const POST_SELECT_FIELDS = `
    pcds.id,
    pcds.users_id,
    pcds.caption_post AS caption,
    pcds.caption_post_raw AS caption_raw,
    pcds.slug,
    pcds.post_category,
    pcds.is_official,
    CASE 
        WHEN pcds.type = 0 THEN 'global'
        WHEN pcds.type = 1 THEN 'event'
        ELSE 'ticket' 
    END AS post_type,
    (SELECT COUNT(*) FROM ir_like_post_content_details lpcds WHERE lpcds.post_content_details_id = pcds.id) AS total_likes,
    (SELECT COUNT(*) FROM ir_comment_post_content_details cpcds WHERE cpcds.post_content_details_id = pcds.id AND cpcds.parent_id IS NULL) AS total_comments,
    (SELECT COUNT(*) FROM ir_impression_post_content_details ipcds WHERE ipcds.post_content_details_id = pcds.id) AS total_impressions,
    TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at,
    json_build_object(
        'name', u.display_name,
        'image', u.photo,
        'verified', CASE WHEN u.is_verified = 1 THEN true ELSE false END,
        'username', u.username
    ) AS user,
    (
        SELECT COALESCE(json_agg(json_build_object('image', fpcds.file)), '[]')
        FROM ir_file_post_content_details fpcds
        WHERE fpcds.post_content_details_id = pcds.id
    ) AS images
`;

const POST_IS_LIKED_FIELD = (userId) => `
    (SELECT EXISTS (
        SELECT 1 FROM ir_like_post_content_details l
        WHERE l.post_content_details_id = pcds.id AND l.users_id = :usersId
    )) AS is_liked
`;

const POST_GROUP_FIELD = `
    CASE WHEN pcds.groups_id IS NOT NULL THEN
        (SELECT json_build_object('slug', g.slug, 'title', g.title) FROM ir_groups g WHERE g.id = pcds.groups_id)
    ELSE NULL END AS "group"
`;

const POST_EVENT_FIELD = `
    CASE WHEN pcds.type = 1 THEN
        (SELECT json_build_object('slug', cd.slug, 'title', cd.title)
         FROM ir_segmented_post_content_details spcd
         JOIN ir_content_details cd ON cd.id = spcd.content_details_id
         WHERE spcd.post_content_details_id = pcds.id LIMIT 1)
    ELSE NULL END AS event
`;

// ═══════════════════════════════════════════════════════════════
// EVENT COMMUNITY POSTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/event/posts/:eventSlug
 * Community posts for an event (type=1, post_category=0, is_official=0)
 */
export const getEventPosts = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const eventSlug = req.params.eventSlug;
        const { page = 1, limit = 10, filter = "latest" } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: users_id, eventSlug, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const orderBy = filter === "popular"
            ? `(SELECT COUNT(*) FROM ir_like_post_content_details lpcds WHERE lpcds.post_content_details_id = pcds.id) DESC`
            : `pcds.created_at DESC`;

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(users_id)},
                ${POST_GROUP_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1
              AND pcds.type = 1
              AND pcds.post_category = 0
              AND pcds.is_official = 0
              AND cd.slug = :eventSlug
            ORDER BY ${orderBy}
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details pcds
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1 AND pcds.type = 1 AND pcds.post_category = 0 AND pcds.is_official = 0 AND cd.slug = :eventSlug
        `, { type: db.QueryTypes.SELECT, replacements });

        return responseApi(res, data, {
            ...buildPaginationMeta(page, limit, total_count),
            assets_image_url: process.env.APP_BUCKET_IMAGE,
        }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getEventPosts", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

/**
 * POST /api/event/posts/:eventSlug
 * Create community post in event
 */
export const createEventPost = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id == 0) return responseApi(res, [], null, "Login needed", 400);

        const { caption_post, groups_id, group_slug } = req.body;
        const eventSlug = req.params.eventSlug;

        if (!caption_post && (!req.files || !req.files.images)) {
            return responseApi(res, [], null, "Post must have caption or images", 400);
        }
        if (caption_post && caption_post.length > 300) {
            return responseApi(res, [], null, "Caption too long", 400);
        }

        const contentDetail = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
        if (!contentDetail) return responseApi(res, [], null, "Event not found", 400);

        // Resolve group: accept numeric groups_id OR group_slug
        let resolvedGroupsId = groups_id || null;
        if (!resolvedGroupsId && group_slug) {
            const group = await GroupsModels.findOne({ where: { slug: group_slug } });
            if (group) resolvedGroupsId = group.id;
        }

        const data = {
            created_at: dateToEpochTime(req.headers["x-date-for"]),
            caption_post: caption_post ? parseToRichText(caption_post) : null,
            caption_post_raw: caption_post || null,
            slug: btoa(dateToEpochTime(req.headers["x-date-for"]) + "-" + makeRandomString(3)),
            users_id,
            type: 1,
            post_category: 0,
            is_official: 0,
            is_accepted: 1,
            groups_id: resolvedGroupsId,
        };

        const post = await PostContentDetailModels.create(data, { transaction });

        await SegmentedPostContentDetailModels.create({
            post_content_details_id: post.id,
            users_id,
            content_details_id: contentDetail.id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        }, { transaction });

        // Upload images to Supabase Storage
        let files = req.files && req.files.images;
        if (files) {
            if (!Array.isArray(files)) files = [files];
            for (const file of files) {
                const storagePath = await uploadPostImage(file);
                if (storagePath) {
                    await FilePostContentDetailModels.create({
                        post_content_details_id: post.id,
                        file: storagePath,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                    }, { transaction });
                }
            }
        }

        return responseApi(res, [{ post_slug: post.slug }], null, "Post created", 0);
    } catch (error) {
        console.log("error createEventPost", error);
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// EVENT OFFICIAL (EO) POSTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/event/official-posts/:eventSlug
 */
export const getEventOfficialPosts = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const eventSlug = req.params.eventSlug;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: users_id, eventSlug, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(users_id)},
                json_build_object('name', eo.name, 'image', eo.image) AS event_organizer
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            JOIN ir_event_organizers eo ON eo.id = cd.event_organizers_id
            WHERE pcds.is_accepted = 1
              AND pcds.type = 1
              AND pcds.is_official = 1
              AND cd.slug = :eventSlug
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details pcds
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1 AND pcds.type = 1 AND pcds.is_official = 1 AND cd.slug = :eventSlug
        `, { type: db.QueryTypes.SELECT, replacements });

        return responseApi(res, data, {
            ...buildPaginationMeta(page, limit, total_count),
            assets_image_url: process.env.APP_BUCKET_IMAGE,
        }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getEventOfficialPosts", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

/**
 * POST /api/event/official-posts/:eventSlug
 * Only the event organizer's user can create official posts
 */
export const createEventOfficialPost = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id == 0) return responseApi(res, [], null, "Login needed", 400);

        const eventSlug = req.params.eventSlug;
        const { caption_post } = req.body;

        if (caption_post && caption_post.length > 300) {
            return responseApi(res, [], null, "Caption too long", 400);
        }

        const contentDetail = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
        if (!contentDetail) return responseApi(res, [], null, "Event not found", 400);

        // EO auth: verify caller is linked to this event's organizer via ir_users_admin
        const [eoCheck] = await db.query(`
            SELECT 1 FROM ir_users_admin ua
            WHERE ua.users_id = :usersId AND ua.event_organizers_id = :eoId
            LIMIT 1
        `, { type: db.QueryTypes.SELECT, replacements: { usersId: users_id, eoId: contentDetail.event_organizers_id } });
        if (!eoCheck) return responseApi(res, [], null, "Not authorized as event organizer", 2);

        const data = {
            created_at: dateToEpochTime(req.headers["x-date-for"]),
            caption_post: caption_post ? parseToRichText(caption_post) : null,
            caption_post_raw: caption_post || null,
            slug: btoa(dateToEpochTime(req.headers["x-date-for"]) + "-" + makeRandomString(3)),
            users_id,
            type: 1,
            post_category: 0,
            is_official: 1,
            is_eo_post: 1,
            is_accepted: 1,
        };

        const post = await PostContentDetailModels.create(data, { transaction });

        await SegmentedPostContentDetailModels.create({
            post_content_details_id: post.id,
            users_id,
            content_details_id: contentDetail.id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        }, { transaction });

        let files = req.files && req.files.images;
        if (files) {
            if (!Array.isArray(files)) files = [files];
            for (const file of files) {
                const storagePath = await uploadPostImage(file);
                if (storagePath) {
                    await FilePostContentDetailModels.create({
                        post_content_details_id: post.id,
                        file: storagePath,
                        created_at: dateToEpochTime(req.headers["x-date-for"]),
                    }, { transaction });
                }
            }
        }

        return responseApi(res, [{ post_slug: post.slug }], null, "Official post created", 0);
    } catch (error) {
        console.log("error createEventOfficialPost", error);
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// EVENT MOMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/event/moments/:eventSlug
 */
export const getEventMoments = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const eventSlug = req.params.eventSlug;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: users_id, eventSlug, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(users_id)},
                ${POST_EVENT_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1
              AND pcds.type = 1
              AND pcds.post_category = 1
              AND cd.slug = :eventSlug
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count
            FROM ir_post_content_details pcds
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1 AND pcds.type = 1 AND pcds.post_category = 1 AND cd.slug = :eventSlug
        `, { type: db.QueryTypes.SELECT, replacements });

        return responseApi(res, data, {
            ...buildPaginationMeta(page, limit, total_count),
            assets_image_url: process.env.APP_BUCKET_IMAGE,
        }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getEventMoments", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// FEEDS (cross-event, for homepage)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/posts/feed
 * Posts feed across all events (homepage)
 */
export const getPostsFeed = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: users_id, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(users_id)},
                ${POST_EVENT_FIELD},
                ${POST_GROUP_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 0
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count FROM ir_post_content_details pcds
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 0
        `, { type: db.QueryTypes.SELECT });

        return responseApi(res, data, {
            ...buildPaginationMeta(page, limit, total_count),
            assets_image_url: process.env.APP_BUCKET_IMAGE,
        }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getPostsFeed", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

/**
 * GET /api/moments/feed
 * Moments feed across all events (homepage)
 */
export const getMomentsFeed = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1, limit = 15 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: users_id, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(users_id)},
                ${POST_EVENT_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 1
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count FROM ir_post_content_details pcds
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 1
        `, { type: db.QueryTypes.SELECT });

        return responseApi(res, data, {
            ...buildPaginationMeta(page, limit, total_count),
            assets_image_url: process.env.APP_BUCKET_IMAGE,
        }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getMomentsFeed", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// BATCH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/batch/likes
 * Body: { slugs: ["slug1", "slug2", ...] }
 * Returns: { slug1: { count, isLiked }, ... }
 */
export const batchGetLikes = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { slugs } = req.body;

        if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
            return responseApi(res, {}, null, "No slugs provided", 0);
        }

        const query = `
            SELECT pcds.slug,
                (SELECT COUNT(*) FROM ir_like_post_content_details l WHERE l.post_content_details_id = pcds.id) AS count,
                (SELECT EXISTS(SELECT 1 FROM ir_like_post_content_details l WHERE l.post_content_details_id = pcds.id AND l.users_id = :usersId)) AS is_liked
            FROM ir_post_content_details pcds
            WHERE pcds.slug IN (:slugs)
        `;

        const rows = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements: { slugs, usersId: users_id },
        });

        const result = {};
        for (const row of rows) {
            result[row.slug] = { count: parseInt(row.count, 10), isLiked: row.is_liked };
        }

        return responseApi(res, result, null, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error batchGetLikes", error);
        return responseApi(res, {}, null, "Server error", 1);
    }
};

/**
 * POST /api/batch/comments
 * Body: { slugs: ["slug1", "slug2", ...] }
 * Returns: { slug1: count, ... }
 */
export const batchGetComments = async (req, res) => {
    try {
        const { slugs } = req.body;
        if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
            return responseApi(res, {}, null, "No slugs provided", 0);
        }

        const query = `
            SELECT pcds.slug,
                (SELECT COUNT(*) FROM ir_comment_post_content_details c WHERE c.post_content_details_id = pcds.id) AS count
            FROM ir_post_content_details pcds
            WHERE pcds.slug IN (:slugs)
        `;

        const rows = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements: { slugs },
        });

        const result = {};
        for (const row of rows) {
            result[row.slug] = parseInt(row.count, 10);
        }

        return responseApi(res, result, null, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error batchGetComments", error);
        return responseApi(res, {}, null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// COMMENT REPLIES (nested 1-level)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/comment/post/:slugPost (updated to support parent_id)
 * Body: { comment_post, parent_id? }
 */
export const commentWithReply = withTransaction(async (req, res, transaction) => {
    try {
        const { comment_post, parent_id } = req.body;
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id === 0) return responseApi(res, [], null, "Login needed", 400);

        const slug = req.params.slugPost;
        const post = await PostContentDetailModels.findOne({ where: { slug } });
        if (!post) return responseApi(res, [], null, "Post not found", 400);
        if (post.is_accepted !== 1) return responseApi(res, [], null, "Post not available", 400);
        if (comment_post.length > 300) return responseApi(res, [], null, "Comment too long", 400);

        // Validate parent_id if provided (must belong to same post, must be top-level)
        if (parent_id) {
            const parentComment = await CommentPostContentDetailModels.findOne({
                where: { id: parent_id, post_content_details_id: post.id, parent_id: null },
            });
            if (!parentComment) return responseApi(res, [], null, "Parent comment not found", 400);
        }

        const comment = await CommentPostContentDetailModels.create({
            users_id,
            post_content_details_id: post.id,
            comment_post,
            parent_id: parent_id || null,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        }, { transaction });

        if (post.users_id !== users_id) {
            await generateNotificationMessage({
                source_id: comment.id,
                users_id: post.users_id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                type: 7,
            });
        }

        return responseApi(res, [{ comment_id: comment.id }], null, "Comment saved", 0);
    } catch (error) {
        console.log("error commentWithReply", error);
        throw error;
    }
});

/**
 * GET /api/comment/replies/:commentId
 */
export const getCommentReplies = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT c.id, c.comment_post, c.parent_id,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'username', u.username,
                    'verified', CASE WHEN u.is_verified = 1 THEN true ELSE false END
                ) AS user,
                TO_CHAR(TO_TIMESTAMP(c.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                (SELECT COUNT(*) FROM ir_like_comment_post_content_details lc WHERE lc.comment_post_content_details_id = c.id) AS total_likes
            FROM ir_comment_post_content_details c
            JOIN ir_users u ON c.users_id = u.id
            WHERE c.parent_id = :commentId
            ORDER BY c.created_at ASC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements: { commentId: parseInt(commentId, 10), limit: parseInt(limit, 10), offset: parseInt(offset, 10) },
        });

        return responseApi(res, data, null, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getCommentReplies", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// COMMENT LIKES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/like/comment/:commentId
 */
export const toggleCommentLike = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id === 0) return responseApi(res, [], null, "Login needed", 400);

        const commentId = parseInt(req.params.commentId, 10);

        const existing = await LikeCommentPostContentDetailModels.findOne({
            where: { comment_post_content_details_id: commentId, users_id },
        });

        if (existing) {
            await existing.destroy({ transaction });
        } else {
            await LikeCommentPostContentDetailModels.create({
                comment_post_content_details_id: commentId,
                users_id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }, { transaction });
        }

        return responseApi(res, [], null, existing ? "Unliked" : "Liked", 0);
    } catch (error) {
        console.log("error toggleCommentLike", error);
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// CREATE MOMENT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/event/moments/:eventSlug
 * Create moment in event (post_category = 1)
 */
export const createEventMoment = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id == 0) return responseApi(res, [], null, "Login needed", 400);

        const { caption_post } = req.body;
        const eventSlug = req.params.eventSlug;

        if (!req.files || !req.files.images) {
            return responseApi(res, [], null, "Moment must have at least one image", 400);
        }

        const contentDetail = await ContentDetailsModels.findOne({ where: { slug: eventSlug } });
        if (!contentDetail) return responseApi(res, [], null, "Event not found", 400);

        const data = {
            created_at: dateToEpochTime(req.headers["x-date-for"]),
            caption_post: caption_post ? parseToRichText(caption_post) : null,
            caption_post_raw: caption_post || null,
            slug: btoa(dateToEpochTime(req.headers["x-date-for"]) + "-" + makeRandomString(3)),
            users_id,
            type: 1,
            post_category: 1,
            is_official: 0,
            is_accepted: 1,
        };

        const post = await PostContentDetailModels.create(data, { transaction });

        await SegmentedPostContentDetailModels.create({
            post_content_details_id: post.id,
            users_id,
            content_details_id: contentDetail.id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        }, { transaction });

        let files = req.files.images;
        if (!Array.isArray(files)) files = [files];
        for (const file of files) {
            const storagePath = await uploadPostImage(file);
            if (storagePath) {
                await FilePostContentDetailModels.create({
                    post_content_details_id: post.id,
                    file: storagePath,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                }, { transaction });
            }
        }

        return responseApi(res, [{ post_slug: post.slug }], null, "Moment created", 0);
    } catch (error) {
        console.log("error createEventMoment", error);
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// DELETE POST / MOMENT
// ═══════════════════════════════════════════════════════════════

/**
 * DELETE /api/event/post/:slug
 */
export const deleteEventPost = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id == 0) return responseApi(res, [], null, "Login needed", 400);

        const slug = req.params.slug;
        const post = await PostContentDetailModels.findOne({ where: { slug } });
        if (!post) return responseApi(res, [], null, "Not found", 400);
        if (post.users_id !== users_id) return responseApi(res, [], null, "Unauthorized", 403);

        await post.destroy({ transaction });
        return responseApi(res, [], null, "Deleted", 0);
    } catch (error) {
        console.log("error deleteEventPost", error);
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// TOGGLE POST LIKE
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/event/post/like/:slug
 */
export const toggleEventPostLike = withTransaction(async (req, res, transaction) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        if (users_id == 0) return responseApi(res, [], null, "Login needed", 400);

        const slug = req.params.slug;
        const post = await PostContentDetailModels.findOne({ where: { slug } });
        if (!post) return responseApi(res, [], null, "Not found", 400);

        const existing = await LikePostContentDetailModels.findOne({
            where: { post_content_details_id: post.id, users_id },
        });

        if (existing) {
            await existing.destroy({ transaction });
        } else {
            await LikePostContentDetailModels.create({
                post_content_details_id: post.id,
                users_id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }, { transaction });
        }

        return responseApi(res, [{ liked: !existing }], null, existing ? "Unliked" : "Liked", 0);
    } catch (error) {
        console.log("error toggleEventPostLike", error);
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// USER PROFILE POSTS & MOMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/event/posts/user/:username
 */
export const getPostsByUser = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const viewer_id = usersToken.tod;
        const username = req.params.username;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: viewer_id, username, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(viewer_id)},
                ${POST_EVENT_FIELD},
                ${POST_GROUP_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 0 AND u.username = :username
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 0 AND u.username = :username
        `, { type: db.QueryTypes.SELECT, replacements });

        return responseApi(res, data, buildPaginationMeta(page, limit, total_count), "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getPostsByUser", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

/**
 * GET /api/event/moments/user/:username
 */
export const getMomentsByUser = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const viewer_id = usersToken.tod;
        const username = req.params.username;
        const { page = 1, limit = 12 } = req.query;
        const offset = (page - 1) * limit;

        const replacements = { usersId: viewer_id, username, limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(viewer_id)},
                ${POST_EVENT_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 1 AND u.username = :username
            ORDER BY pcds.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements });

        const [{ total_count }] = await db.query(`
            SELECT COUNT(*) AS total_count FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.is_accepted = 1 AND pcds.post_category = 1 AND u.username = :username
        `, { type: db.QueryTypes.SELECT, replacements });

        return responseApi(res, data, buildPaginationMeta(page, limit, total_count), "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getMomentsByUser", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

/**
 * GET /api/event/post/detail/:slug
 * Single post detail (works for any post type)
 */
export const getEventPostDetail = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const slug = req.params.slug;

        const replacements = { usersId: users_id, slug };

        const query = `
            SELECT ${POST_SELECT_FIELDS},
                ${POST_IS_LIKED_FIELD(users_id)},
                ${POST_EVENT_FIELD},
                ${POST_GROUP_FIELD}
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            WHERE pcds.slug = :slug
        `;

        const data = await db.query(query, { type: db.QueryTypes.SELECT, replacements, plain: true });

        if (!data) return responseApi(res, [], null, "Post not found", 400);

        return responseApi(res, data, { assets_image_url: process.env.APP_BUCKET_IMAGE }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getEventPostDetail", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// HOMEPAGE FEED (followed events)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/feed/home
 * Returns interleaved posts & moments from events the user follows.
 * Query params:
 *   filter  - "latest" (default) | "popular" | "event:<eventSlug>"
 *   page    - page number (default 1)
 *   limit   - items per page (default 15)
 *   since   - epoch ms; sets meta.has_new if newer content exists
 */
export const getHomeFeed = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { page = 1, limit = 15, filter = 'latest', since } = req.query;
        const offset = (page - 1) * limit;

        // Followed event IDs
        const followedRows = await db.query(`
            SELECT content_details_id FROM ir_content_detail_followers WHERE users_id = :usersId
        `, { type: db.QueryTypes.SELECT, replacements: { usersId: users_id } });

        if (followedRows.length === 0) {
            return responseApi(res, [], {
                no_followed_events: true,
                has_new: false,
                pagination: { current_page: parseInt(page, 10), per_page: parseInt(limit, 10), total: 0, total_page: 0 },
            }, "Data has been retrieved", 0);
        }

        const followedIds = followedRows.map(r => r.content_details_id);

        let eventSlugFilter = null;
        if (filter && filter.startsWith('event:')) {
            eventSlugFilter = filter.slice(6);
        }

        const orderBy = filter === 'popular'
            ? `pcds.impression_count DESC, pcds.created_at DESC`
            : `pcds.created_at DESC`;

        const eventWhere = eventSlugFilter
            ? `AND cd.slug = :eventSlugFilter`
            : `AND cd.id IN (:followedIds)`;

        const replacements = {
            usersId: users_id,
            followedIds,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            ...(eventSlugFilter ? { eventSlugFilter } : {}),
        };

        const query = `
            SELECT
                pcds.id,
                pcds.slug,
                CASE WHEN pcds.post_category = 0 THEN 'post' ELSE 'moment' END AS content_type,
                pcds.is_official,
                pcds.is_eo_post,
                pcds.caption_post AS caption,
                pcds.caption_post_raw AS caption_raw,
                pcds.impression_count,
                (SELECT COUNT(*) FROM ir_like_post_content_details lpcds WHERE lpcds.post_content_details_id = pcds.id) AS total_likes,
                (SELECT COUNT(*) FROM ir_comment_post_content_details cpcds WHERE cpcds.post_content_details_id = pcds.id AND cpcds.parent_id IS NULL) AS total_comments,
                (SELECT EXISTS (
                    SELECT 1 FROM ir_like_post_content_details l
                    WHERE l.post_content_details_id = pcds.id AND l.users_id = :usersId
                )) AS is_liked,
                TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                pcds.created_at AS created_at_epoch,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'verified', CASE WHEN u.is_verified = 1 THEN true ELSE false END,
                    'username', u.username
                ) AS user,
                json_build_object('slug', cd.slug, 'title', cd.title) AS event,
                ${POST_GROUP_FIELD},
                (
                    SELECT COALESCE(json_agg(json_build_object('image', fpcds.file)), '[]')
                    FROM ir_file_post_content_details fpcds
                    WHERE fpcds.post_content_details_id = pcds.id
                ) AS images
            FROM ir_post_content_details pcds
            JOIN ir_users u ON pcds.users_id = u.id
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1
              AND pcds.type = 1
              ${eventWhere}
            ORDER BY ${orderBy}
            LIMIT :limit OFFSET :offset
        `;

        const countQuery = `
            SELECT COUNT(DISTINCT pcds.id) AS total_count
            FROM ir_post_content_details pcds
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            JOIN ir_content_details cd ON cd.id = spcd.content_details_id
            WHERE pcds.is_accepted = 1
              AND pcds.type = 1
              ${eventWhere}
        `;

        const [data, [{ total_count }]] = await Promise.all([
            db.query(query, { type: db.QueryTypes.SELECT, replacements }),
            db.query(countQuery, { type: db.QueryTypes.SELECT, replacements }),
        ]);

        let has_new = false;
        if (since) {
            const sinceEpoch = Math.floor(parseInt(since, 10) / 1000);
            const newCheckQuery = `
                SELECT EXISTS (
                    SELECT 1 FROM ir_post_content_details pcds
                    JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
                    JOIN ir_content_details cd ON cd.id = spcd.content_details_id
                    WHERE pcds.is_accepted = 1
                      AND pcds.type = 1
                      AND pcds.created_at > :sinceEpoch
                      ${eventWhere}
                ) AS has_new
            `;
            const [{ has_new: hn }] = await db.query(newCheckQuery, {
                type: db.QueryTypes.SELECT,
                replacements: { ...replacements, sinceEpoch },
            });
            has_new = hn;
        }

        return responseApi(res, data, {
            no_followed_events: false,
            has_new,
            assets_image_url: process.env.APP_BUCKET_IMAGE,
            pagination: {
                current_page: parseInt(page, 10),
                per_page: parseInt(limit, 10),
                total: parseInt(total_count, 10),
                total_page: Math.ceil(total_count / limit),
            },
        }, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getHomeFeed", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

/**
 * GET /api/feed/home/new-count
 * Lightweight new-content check. Returns { count, has_new } without post data.
 * Query params: since (epoch ms, required)
 */
export const getHomeFeedNewCount = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { since } = req.query;

        if (!since) return responseApi(res, { count: 0, has_new: false }, null, "since param required", 0);

        const sinceEpoch = Math.floor(parseInt(since, 10) / 1000);

        const followedRows = await db.query(`
            SELECT content_details_id FROM ir_content_detail_followers WHERE users_id = :usersId
        `, { type: db.QueryTypes.SELECT, replacements: { usersId: users_id } });

        if (followedRows.length === 0) {
            return responseApi(res, { count: 0, has_new: false }, null, "Data has been retrieved", 0);
        }

        const followedIds = followedRows.map(r => r.content_details_id);

        const [{ count }] = await db.query(`
            SELECT COUNT(DISTINCT pcds.id) AS count
            FROM ir_post_content_details pcds
            JOIN ir_segmented_post_content_details spcd ON spcd.post_content_details_id = pcds.id
            WHERE pcds.is_accepted = 1
              AND pcds.type = 1
              AND pcds.created_at > :sinceEpoch
              AND spcd.content_details_id IN (:followedIds)
        `, { type: db.QueryTypes.SELECT, replacements: { usersId: users_id, sinceEpoch, followedIds } });

        const countNum = parseInt(count, 10);
        return responseApi(res, { count: countNum, has_new: countNum > 0 }, null, "Data has been retrieved", 0);
    } catch (error) {
        console.log("error getHomeFeedNewCount", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};
