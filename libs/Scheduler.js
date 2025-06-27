import db from "../configs/Database.js";
import { reminderAnyChatOnGroups, sendMail } from "./Mailist.js";

export async function sendNotifChatGroup() {
    try {
        const query = `
            SELECT DISTINCT
                icds.slug AS eventSlug,
                ig.slug AS groupSlug,
                ig.title,
                u.username,
                u.email
            FROM
                ir_chat_groups_status icgs
                JOIN ir_users u ON icgs.users_id = u.id
                JOIN ir_groups ig ON icgs.groups_id = ig.id
                JOIN ir_content_details icds ON ig.content_details_id = icds.id
            WHERE 
                icgs.status = 1
        `;

        const users = await db.query(query, {
            type: db.QueryTypes.SELECT,
        });

        for (const user of users) {
            const { email, username, title, eventSlug, groupSlug } = user;

            await sendMail(
                email,
                `Notifikasi Pesan Baru!`,
                reminderAnyChatOnGroups({
                    eventSlug: eventSlug,
                    username: username,
                    groupSlug: groupSlug,
                    groupTitle: title,
                })
            );

            console.log(`[SENT] Email sent to ${email}`);
        }

        return users;
    } catch (error) {
        console.error("[ERROR]", error);
    }
}

// sendNotifChatGroup();
