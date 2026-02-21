// libs/schedulers/sendEmailChat.js
import cron from 'node-cron'
import db from '../../configs/Database.js'
import { reminderAnyChatOnGroups, sendMail } from '../Mailist.js'

export const job = () => {
    cron.schedule('*/15 * * * *', async () => {
        console.log('[CRON] Mulai kirim email notifikasi grup...')

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
                WHERE icgs.status = 1
            `

            const users = await db.query(query, {
                type: db.QueryTypes.SELECT,
            })

            for (const user of users) {
                const { email, username, title, eventslug, groupslug } = user

                await sendMail(
                    email,
                    'Notifikasi Pesan Baru!',
                    reminderAnyChatOnGroups({
                        eventSlug: eventslug,
                        username,
                        groupSlug: groupslug,
                        groupTitle: title,
                    })
                )

                console.log(`[EMAIL] Dikirim ke ${email}`)
            }
        } catch (error) {
            console.error('[CRON ERROR]', error)
        }
    })
}
