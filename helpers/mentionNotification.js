import db from "../configs/Database.js";
import supabase from "../configs/Supabase.js";

/**
 * Parse @username mentions from caption and send Supabase notifications.
 *
 * @param {object} opts
 * @param {string} opts.caption        - Raw caption text
 * @param {number|string} opts.actorId - ID of user who wrote the caption
 * @param {string} opts.referenceId    - Slug of the post/moment/comment
 * @param {string} opts.referenceType  - 'post' | 'moment' | 'comment_post' | 'comment_moment'
 * @param {string|null} opts.referenceEventId - Event slug (for deep-link navigation)
 */
export async function sendMentionNotifications({ caption, actorId, referenceId, referenceType, referenceEventId }) {
    try {
        const usernames = [...new Set((caption.match(/@(\w+)/g) || []).map(m => m.slice(1)))];
        if (!usernames.length) return;

        const [actorRows, mentionedRows] = await Promise.all([
            db.query(
                `SELECT id, display_name, username, photo FROM ir_users WHERE id = :id LIMIT 1`,
                { replacements: { id: actorId }, type: db.QueryTypes.SELECT }
            ),
            db.query(
                `SELECT id, username FROM ir_users WHERE username IN (:usernames) AND (is_deleted IS NULL OR is_deleted = 0)`,
                { replacements: { usernames }, type: db.QueryTypes.SELECT }
            ),
        ]);

        const actor = actorRows[0];
        if (!actor) return;

        const actorImage = actor.photo
            ? (actor.photo.startsWith('http') ? actor.photo : `${process.env.APP_BUCKET_IMAGE || ''}${actor.photo}`)
            : null;

        const contextLabel = referenceType === 'comment_post' || referenceType === 'comment_moment'
            ? 'in a comment'
            : `in a ${referenceType}`;

        for (const u of mentionedRows) {
            if (String(u.id) === String(actorId)) continue;
            await supabase.from('notifications').insert({
                user_id: String(u.id),
                actor_id: String(actorId),
                actor_name: actor.display_name || actor.username,
                actor_username: actor.username,
                actor_image: actorImage,
                type: 'mention',
                reference_id: referenceId,
                reference_type: referenceType,
                reference_event_id: referenceEventId ?? null,
                actor_count: 1,
                message: `${actor.display_name || actor.username} mentioned you ${contextLabel}`,
                is_read: false,
            });
        }
    } catch (e) {
        console.log('[MENTION NOTIF ERROR]', e);
    }
}
