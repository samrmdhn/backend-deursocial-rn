import supabase from "../../configs/Supabase.js";
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
// LINK PREVIEW (offloaded from client)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/chat/link-preview
 * Body: { url: string } OR { text: string }
 * Extracts OG metadata from a URL (or first URL found in text).
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
// LATEST MESSAGE PER GROUP (for messages list screen)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/chat/messages/latest-per-group
 * Body: { group_slugs: string[] }
 * Returns a map of group_slug → latest message.
 */
export const getLatestMessagePerGroup = async (req, res) => {
    try {
        const { group_slugs } = req.body;

        if (!group_slugs || !Array.isArray(group_slugs) || group_slugs.length === 0) {
            return responseApi(res, {}, null, "group_slugs array is required", 1);
        }

        const result = {};

        await Promise.all(
            group_slugs.map(async (slug) => {
                const { data, error } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("group_slug", slug)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (!error && data && data.length > 0) {
                    result[slug] = data[0];
                }
            }),
        );

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
 * Returns a map of group_slug → unread count.
 */
export const getUnreadCountsPerGroup = async (req, res) => {
    try {
        const { group_slugs, user_id } = req.body;

        if (!group_slugs || !user_id) {
            return responseApi(res, {}, null, "group_slugs and user_id are required", 1);
        }

        // Fetch user join dates for all groups
        const { data: userGroups } = await supabase
            .from("user_groups")
            .select("group_slug, joined_at")
            .eq("user_id", user_id)
            .in("group_slug", group_slugs);

        const joinDates = {};
        for (const ug of userGroups || []) {
            joinDates[ug.group_slug] = ug.joined_at;
        }

        const result = {};

        await Promise.all(
            group_slugs.map(async (slug) => {
                const joinDate = joinDates[slug];

                // Get messages in this group not sent by this user
                let query = supabase
                    .from("messages")
                    .select("id")
                    .eq("group_slug", slug)
                    .neq("user_id", user_id);

                if (joinDate) {
                    query = query.gte("created_at", joinDate);
                }

                const { data: messages, error: msgError } = await query;

                if (msgError || !messages || messages.length === 0) {
                    result[slug] = 0;
                    return;
                }

                // Get which of those messages have been read by this user
                const msgIds = messages.map((m) => m.id);
                const { data: reads } = await supabase
                    .from("message_reads")
                    .select("message_id")
                    .in("message_id", msgIds)
                    .eq("user_id", user_id);

                const readIds = new Set((reads || []).map((r) => r.message_id));
                result[slug] = msgIds.filter((id) => !readIds.has(id)).length;
            }),
        );

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

        // Generate deterministic slug
        const sorted = [current_username, other_username].sort();
        const slug = `dm_${sorted[0]}_${sorted[1]}`;

        // Check existing
        const { data: existing } = await supabase
            .from("conversations")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();

        if (existing) {
            return responseApi(res, existing, null, "Conversation found", 0);
        }

        // Create
        const user1Id = sorted[0] === current_username
            ? current_user_id || current_username
            : other_user_id || other_username;
        const user2Id = sorted[0] === current_username
            ? other_user_id || other_username
            : current_user_id || current_username;

        const { data: conversation, error } = await supabase
            .from("conversations")
            .insert({
                user1_id: user1Id,
                user2_id: user2Id,
                slug,
            })
            .select()
            .single();

        if (error) {
            console.error("[ChatControllers] getOrCreateConversation insert error:", error.message);
            return responseApi(res, null, null, "Failed to create conversation", 1);
        }

        return responseApi(res, conversation, null, "Conversation created", 0);
    } catch (error) {
        console.error("[ChatControllers] getOrCreateConversation error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};

/**
 * GET /api/chat/conversations/:username/:userId
 * Fetch all DM conversations for a user.
 * This is the heavy query that benefits from being on the server.
 */
export const getUserConversations = async (req, res) => {
    try {
        const { username, userId } = req.params;

        // Fetch all DM messages for this user
        const { data: allDmMsgs, error } = await supabase
            .from("messages")
            .select("*")
            .like("group_slug", "dm_%")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (error || !allDmMsgs) {
            console.error("[ChatControllers] getUserConversations error:", error?.message);
            return responseApi(res, [], null, "Failed to fetch conversations", 1);
        }

        // Group messages by slug, filtering only slugs that contain this user
        const slugMap = new Map();
        for (const msg of allDmMsgs) {
            const body = msg.group_slug.slice(3); // remove "dm_"
            const belongsToUser =
                body.startsWith(username + "_") || body.endsWith("_" + username);
            if (!belongsToUser) continue;
            if (!slugMap.has(msg.group_slug)) {
                slugMap.set(msg.group_slug, []);
            }
            slugMap.get(msg.group_slug).push(msg);
        }

        // Build conversation list from grouped messages
        const results = await Promise.all(
            Array.from(slugMap.entries()).map(async ([slug, msgs]) => {
                const body = slug.slice(3);
                const otherUsername = body.startsWith(username + "_")
                    ? body.slice(username.length + 1)
                    : body.slice(0, body.length - username.length - 1);

                // Last message is the first one (already sorted desc)
                const lastMessage = msgs[0];

                // Get other user's profile from their latest message
                let otherUser = {
                    user_id: otherUsername,
                    display_name: otherUsername,
                    username: otherUsername,
                    user_image: null,
                };

                const otherMsg = msgs.find((m) => m.username === otherUsername);
                if (otherMsg) {
                    otherUser = {
                        user_id: otherMsg.user_id,
                        display_name: otherMsg.display_name,
                        username: otherMsg.username,
                        user_image: otherMsg.user_image,
                    };
                }

                // Count unread messages
                const otherMsgIds = msgs
                    .filter((m) => m.user_id !== userId)
                    .map((m) => m.id);

                let unreadCount = 0;
                if (otherMsgIds.length > 0) {
                    const { data: reads } = await supabase
                        .from("message_reads")
                        .select("message_id")
                        .in("message_id", otherMsgIds)
                        .eq("user_id", userId);

                    const readIds = new Set((reads || []).map((r) => r.message_id));
                    unreadCount = otherMsgIds.filter((id) => !readIds.has(id)).length;
                }

                return {
                    conversation: { slug, created_at: lastMessage.created_at },
                    otherUser,
                    lastMessage,
                    unreadCount,
                };
            }),
        );

        // Sort by latest message
        results.sort((a, b) => {
            return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

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

        const { data: point, error } = await supabase
            .from("meeting_points")
            .select("*")
            .eq("group_slug", groupSlug)
            .maybeSingle();

        if (error) {
            console.error("[ChatControllers] getMeetingPoint error:", error.message);
            return responseApi(res, null, null, "Server error", 1);
        }

        if (!point) {
            return responseApi(res, null, null, "No meeting point set", 2);
        }

        return responseApi(res, point, null, "Meeting point retrieved", 0);
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

        const {
            group_slug,
            name,
            notes,
            latitude,
            longitude,
            set_by,
            set_by_user_id,
        } = req.body;

        const { data: point, error } = await supabase
            .from("meeting_points")
            .upsert(
                {
                    group_slug,
                    name,
                    notes: notes || null,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    set_by,
                    set_by_user_id,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "group_slug" },
            )
            .select()
            .single();

        if (error) {
            console.error("[ChatControllers] setMeetingPoint error:", error.message);
            return responseApi(res, null, null, "Failed to save meeting point", 1);
        }

        return responseApi(res, point, null, "Meeting point saved successfully", 0);
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
        const { page = 0, limit = 30 } = req.query;

        const from = parseInt(page) * parseInt(limit);
        const to = from + parseInt(limit) - 1;

        const { data: media, error } = await supabase
            .from("group_media")
            .select("*")
            .eq("group_slug", groupSlug)
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("[ChatControllers] getGroupMedia error:", error.message);
            return responseApi(res, [], null, "Server error", 1);
        }

        return responseApi(res, media || [], {
            count: (media || []).length,
            page: parseInt(page),
            has_more: (media || []).length >= parseInt(limit),
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

        const { data, error } = await supabase
            .from("user_groups")
            .select("joined_at")
            .eq("user_id", userId)
            .eq("group_slug", groupSlug)
            .order("joined_at", { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            return responseApi(
                res,
                null,
                null,
                "User not found in group",
                2,
            );
        }

        return responseApi(res, { joined_at: data[0].joined_at }, null, "Join date retrieved", 0);
    } catch (error) {
        console.error("[ChatControllers] getUserJoinDate error:", error);
        return responseApi(res, null, null, "Server error", 1);
    }
};
