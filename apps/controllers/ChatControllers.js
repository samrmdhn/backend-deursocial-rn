import sdb from "../../configs/SupabaseDatabase.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import {
    validationSetMeetingPoint,
    validationGetOrCreateConversation,
} from "../validators/chatValidators.js";

// ─── Helper: Extract URL from text ──────────────────────────

const extractUrl = (text) => {
    const urlRegex =
        /(https?:\/\/[^\s<>"{}|\\^`[\]]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|org|net|io|dev|co|app|me|info|biz|edu|gov|xyz|ai|uk|id|us|de|fr|jp|kr|cn|in|au|ca|br|ru|nl|se|no|fi|dk|pl|cz|it|es|pt|be|at|ch|za|ng|ke|gh|my|sg|ph|th|tw|hk|nz|ar|mx|cl|pe|co\.uk|co\.id|co\.jp|co\.kr|co\.nz|co\.za|com\.au|com\.br|com\.mx|com\.sg|com\.my)(?:\/[^\s<>"{}|\\^`[\]]*)?)/i;
    const match = text.match(urlRegex);
    if (!match) return null;
    const url = match[1];
    return url.startsWith("http") ? url : `https://${url}`;
};

// ─── Helper: Fetch OG metadata ─────────────────────────────

const fetchLinkPreviewInternal = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; DeursocialBot/1.0)" },
        });
        clearTimeout(timeout);
        if (!response.ok) return null;

        const html = await response.text();
        const getMetaContent = (property) => {
            const regex = new RegExp(
                `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
                "i",
            );
            const match = html.match(regex);
            return match ? match[1] || match[2] || null : null;
        };

        const title =
            getMetaContent("og:title") ||
            getMetaContent("twitter:title") ||
            html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
            null;
        const description =
            getMetaContent("og:description") ||
            getMetaContent("twitter:description") ||
            getMetaContent("description") ||
            null;
        const image =
            getMetaContent("og:image") || getMetaContent("twitter:image") || null;

        if (!title && !description && !image) return null;
        return {
            link_url: url,
            link_title: title?.slice(0, 200) || null,
            link_description: description?.slice(0, 300) || null,
            link_image: image || null,
        };
    } catch {
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════
// LINK PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/chat/link-preview
 * Body: { url: string } OR { text: string }
 */
export const getLinkPreview = async (req, res) => {
    try {
        let { url, text } = req.body;

        if (!url && text) {
            url = extractUrl(text);
        }

        if (!url) {
            return responseApi(res, null, null, "No URL provided", 1);
        }

        const preview = await fetchLinkPreviewInternal(url);

        if (!preview) {
            return responseApi(res, null, null, "Could not fetch preview", 2);
        }

        return responseApi(res, preview, null, "Link preview fetched", 0);
    } catch (error) {
        console.error("[ChatControllers] getLinkPreview error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// LATEST MESSAGE PER GROUP
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/chat/messages/latest-per-group
 * Body: { group_slugs: string[] }
 */
export const getLatestMessagePerGroup = async (req, res) => {
    try {
        const { group_slugs } = req.body;

        if (!group_slugs || !Array.isArray(group_slugs) || group_slugs.length === 0) {
            return responseApi(res, {}, null, "group_slugs array is required", 1);
        }

        const rows = await sdb.query(
            `SELECT DISTINCT ON (group_slug) *
             FROM messages
             WHERE group_slug = ANY($1::text[])
               AND deleted_at IS NULL
             ORDER BY group_slug, created_at DESC`,
            {
                bind: [group_slugs],
                type: sdb.QueryTypes.SELECT,
            },
        );

        const result = {};
        for (const row of rows) {
            result[row.group_slug] = row;
        }

        return responseApi(res, result, { count: Object.keys(result).length }, "Latest messages per group", 0);
    } catch (error) {
        console.error("[ChatControllers] getLatestMessagePerGroup error:", error);
        return responseApi(res, {}, null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNTS PER GROUP
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/chat/messages/unread-counts
 * Body: { group_slugs: string[], user_id: string }
 */
export const getUnreadCountsPerGroup = async (req, res) => {
    try {
        const { group_slugs, user_id } = req.body;

        if (!group_slugs || !user_id) {
            return responseApi(res, {}, null, "group_slugs and user_id are required", 1);
        }

        const rows = await sdb.query(
            `WITH join_dates AS (
                SELECT group_slug, MAX(joined_at) AS joined_at
                FROM user_groups
                WHERE user_id = $2
                  AND group_slug = ANY($1::text[])
                GROUP BY group_slug
            )
            SELECT
                gs.group_slug,
                COUNT(m.id) AS unread_count
            FROM unnest($1::text[]) AS gs(group_slug)
            LEFT JOIN messages m ON m.group_slug = gs.group_slug
                AND m.user_id != $2
                AND m.deleted_at IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM message_reads mr
                    WHERE mr.message_id = m.id AND mr.user_id = $2
                )
            LEFT JOIN join_dates jd ON jd.group_slug = gs.group_slug
            WHERE m.id IS NULL
               OR (jd.joined_at IS NULL OR m.created_at >= jd.joined_at)
            GROUP BY gs.group_slug`,
            {
                bind: [group_slugs, user_id],
                type: sdb.QueryTypes.SELECT,
            },
        );

        const result = {};
        // Initialise all slugs to 0 first
        for (const slug of group_slugs) {
            result[slug] = 0;
        }
        for (const row of rows) {
            result[row.group_slug] = parseInt(row.unread_count, 10);
        }

        return responseApi(res, result, null, "Unread counts retrieved", 0);
    } catch (error) {
        console.error("[ChatControllers] getUnreadCountsPerGroup error:", error);
        return responseApi(res, {}, null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// DM CONVERSATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/chat/conversations/get-or-create
 * Body: { current_username, other_username, current_user_id?, other_user_id? }
 */
export const getOrCreateConversation = async (req, res) => {
    try {
        const { error: validationError } = validationGetOrCreateConversation(req.body);
        if (validationError) {
            return responseApi(res, null, null, validationError.details[0].message, 1);
        }

        const { current_username, other_username, current_user_id, other_user_id } = req.body;

        const sorted = [current_username, other_username].sort();
        const slug = `dm_${sorted[0]}_${sorted[1]}`;

        const user1Id = sorted[0] === current_username
            ? current_user_id || current_username
            : other_user_id || other_username;
        const user2Id = sorted[0] === current_username
            ? other_user_id || other_username
            : current_user_id || current_username;

        const existing = await sdb.query(
            `SELECT * FROM conversations WHERE slug = :slug LIMIT 1`,
            { replacements: { slug }, type: sdb.QueryTypes.SELECT },
        );

        if (existing.length > 0) {
            return responseApi(res, existing[0], null, "Conversation found", 0);
        }

        const created = await sdb.query(
            `INSERT INTO conversations (user1_id, user2_id, slug)
             VALUES (:user1Id, :user2Id, :slug)
             ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
             RETURNING *`,
            {
                replacements: { user1Id, user2Id, slug },
                type: sdb.QueryTypes.SELECT,
            },
        );

        return responseApi(res, created[0], null, "Conversation created", 0);
    } catch (error) {
        console.error("[ChatControllers] getOrCreateConversation error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};

/**
 * GET /api/chat/conversations/:username/:userId
 * Fetch all DM conversations for a user with last message and unread count.
 */
export const getUserConversations = async (req, res) => {
    try {
        const { username, userId } = req.params;

        const rows = await sdb.query(
            `WITH latest_msg AS (
                SELECT DISTINCT ON (group_slug) *
                FROM messages
                WHERE (group_slug LIKE :pattern1 OR group_slug LIKE :pattern2)
                  AND deleted_at IS NULL
                ORDER BY group_slug, created_at DESC
            ),
            other_profile AS (
                SELECT DISTINCT ON (m.group_slug)
                    m.group_slug,
                    m.user_id,
                    m.display_name,
                    m.username,
                    m.user_image
                FROM messages m
                WHERE (m.group_slug LIKE :pattern1 OR m.group_slug LIKE :pattern2)
                  AND m.username != :username
                  AND m.deleted_at IS NULL
                ORDER BY m.group_slug, m.created_at DESC
            ),
            unread AS (
                SELECT
                    m.group_slug,
                    COUNT(*) AS unread_count
                FROM messages m
                WHERE (m.group_slug LIKE :pattern1 OR m.group_slug LIKE :pattern2)
                  AND m.user_id != :userId
                  AND m.deleted_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM message_reads mr
                      WHERE mr.message_id = m.id AND mr.user_id = :userId
                  )
                GROUP BY m.group_slug
            )
            SELECT
                lm.group_slug AS slug,
                lm.created_at AS conversation_created_at,
                lm.id, lm.user_id, lm.display_name, lm.username,
                lm.user_image, lm.message, lm.message_type,
                lm.image_url, lm.link_url, lm.link_title,
                lm.link_description, lm.link_image,
                lm.created_at AS last_message_at,
                lm.deleted_at,
                COALESCE(op.user_id, '')      AS other_user_id,
                COALESCE(op.display_name, '') AS other_display_name,
                COALESCE(op.username, '')     AS other_username,
                op.user_image                 AS other_user_image,
                COALESCE(u.unread_count, 0)   AS unread_count
            FROM latest_msg lm
            LEFT JOIN other_profile op ON op.group_slug = lm.group_slug
            LEFT JOIN unread u ON u.group_slug = lm.group_slug
            ORDER BY lm.created_at DESC`,
            {
                replacements: {
                    pattern1: `dm_${username}_%`,
                    pattern2: `dm_%_${username}`,
                    username,
                    userId,
                },
                type: sdb.QueryTypes.SELECT,
            },
        );

        const results = rows.map((row) => ({
            conversation: { slug: row.slug, created_at: row.conversation_created_at },
            otherUser: {
                user_id: row.other_user_id,
                display_name: row.other_display_name,
                username: row.other_username,
                user_image: row.other_user_image,
            },
            lastMessage: row.id ? {
                id: row.id,
                group_slug: row.slug,
                user_id: row.user_id,
                display_name: row.display_name,
                username: row.username,
                user_image: row.user_image,
                message: row.message,
                message_type: row.message_type,
                image_url: row.image_url,
                link_url: row.link_url,
                link_title: row.link_title,
                link_description: row.link_description,
                link_image: row.link_image,
                created_at: row.last_message_at,
                deleted_at: row.deleted_at,
            } : null,
            unreadCount: parseInt(row.unread_count, 10),
        }));

        return responseApi(res, results, { count: results.length }, "Conversations retrieved", 0);
    } catch (error) {
        console.error("[ChatControllers] getUserConversations error:", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// MEETING POINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/chat/meeting-point/:groupSlug
 */
export const getMeetingPoint = async (req, res) => {
    try {
        const { groupSlug } = req.params;

        const rows = await sdb.query(
            `SELECT * FROM meeting_points WHERE group_slug = :groupSlug LIMIT 1`,
            { replacements: { groupSlug }, type: sdb.QueryTypes.SELECT },
        );

        if (rows.length === 0) {
            return responseApi(res, null, null, "No meeting point set", 2);
        }

        return responseApi(res, rows[0], null, "Meeting point retrieved", 0);
    } catch (error) {
        console.error("[ChatControllers] getMeetingPoint error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};

/**
 * POST /api/chat/meeting-point
 * Body: { group_slug, name, notes?, latitude?, longitude?, set_by, set_by_user_id }
 */
export const setMeetingPoint = async (req, res) => {
    try {
        const { error: validationError } = validationSetMeetingPoint(req.body);
        if (validationError) {
            return responseApi(res, null, null, validationError.details[0].message, 1);
        }

        const { group_slug, name, notes, latitude, longitude, set_by, set_by_user_id } = req.body;

        const rows = await sdb.query(
            `INSERT INTO meeting_points (group_slug, name, notes, latitude, longitude, set_by, set_by_user_id, updated_at)
             VALUES (:group_slug, :name, :notes, :latitude, :longitude, :set_by, :set_by_user_id, NOW())
             ON CONFLICT (group_slug) DO UPDATE SET
                 name           = EXCLUDED.name,
                 notes          = EXCLUDED.notes,
                 latitude       = EXCLUDED.latitude,
                 longitude      = EXCLUDED.longitude,
                 set_by         = EXCLUDED.set_by,
                 set_by_user_id = EXCLUDED.set_by_user_id,
                 updated_at     = NOW()
             RETURNING *`,
            {
                replacements: {
                    group_slug,
                    name,
                    notes: notes || null,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    set_by,
                    set_by_user_id,
                },
                type: sdb.QueryTypes.SELECT,
            },
        );

        return responseApi(res, rows[0], null, "Meeting point saved successfully", 0);
    } catch (error) {
        console.error("[ChatControllers] setMeetingPoint error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// MEDIA GALLERY
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/chat/media/:groupSlug
 * Query: ?page=0&limit=30
 */
export const getGroupMedia = async (req, res) => {
    try {
        const { groupSlug } = req.params;
        const page = parseInt(req.query.page || "0", 10);
        const limit = parseInt(req.query.limit || "30", 10);
        const offset = page * limit;

        const rows = await sdb.query(
            `SELECT * FROM group_media
             WHERE group_slug = :groupSlug
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset`,
            {
                replacements: { groupSlug, limit, offset },
                type: sdb.QueryTypes.SELECT,
            },
        );

        return responseApi(res, rows, {
            count: rows.length,
            page,
            has_more: rows.length >= limit,
        }, "Group media retrieved", 0);
    } catch (error) {
        console.error("[ChatControllers] getGroupMedia error:", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

// ═══════════════════════════════════════════════════════════════
// USER JOIN DATE
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/chat/user-groups/:userId/:groupSlug/join-date
 */
export const getUserJoinDate = async (req, res) => {
    try {
        const { userId, groupSlug } = req.params;

        const rows = await sdb.query(
            `SELECT joined_at FROM user_groups
             WHERE user_id = :userId AND group_slug = :groupSlug
             ORDER BY joined_at DESC
             LIMIT 1`,
            {
                replacements: { userId, groupSlug },
                type: sdb.QueryTypes.SELECT,
            },
        );

        if (rows.length === 0) {
            return responseApi(res, null, null, "User not found in group", 2);
        }

        return responseApi(res, { joined_at: rows[0].joined_at }, null, "Join date retrieved", 0);
    } catch (error) {
        console.error("[ChatControllers] getUserJoinDate error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};
