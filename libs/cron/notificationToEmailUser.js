// libs/schedulers/sendEmailChat.js
import cron from 'node-cron'
import db from '../../configs/Database.js'
import { reminderAnyNotification, sendMail } from '../Mailist.js'
import NotificationModels from '../../apps/models/NotificationModels.js'
import { dateToEpochTime } from '../../helpers/customHelpers.js'

export const job = () => {
    cron.schedule('0 */5 * * *', async () => {
        console.log('[CRON] Mulai kirim email notifikasi ke user...')

        try {
            const query = `
                SELECT
                    u.email,
                    u.username,
                    MIN(ins.id) AS notif_id -- atau MAX terserah lu
                FROM
                    ir_notifications ins
                    INNER JOIN ir_users u ON ins.users_id = u.id
                WHERE
                    ins.is_read = 1 
                    AND ins.send_mail_at IS NULL
                GROUP BY
                    u.email, u.username
            `

            const users = await db.query(query, {
                type: db.QueryTypes.SELECT,
            })

            for (const user of users) {
                const { email, username, notif_id } = user;
                await NotificationModels.update(
                    {
                        send_mail_at: dateToEpochTime(new Date().toISOString())
                    },
                    {
                        where: {
                            id: notif_id,
                        }
                    }
                );
                await sendMail(
                    email,
                    'Notifikasi Pesan Baru!',
                    reminderAnyNotification({
                        username
                    })
                )

                console.log(`[EMAIL] Dikirim ke ${email}`)
            }
        } catch (error) {
            console.error('[CRON ERROR]', error)
        }
    }, {
        timezone: 'Asia/Jakarta'
    })
}
