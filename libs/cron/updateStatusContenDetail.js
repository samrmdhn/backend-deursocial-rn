import cron from 'node-cron'
import db from '../../configs/Database.js'
import { reminderAnyNotification, sendMail } from '../Mailist.js'
import NotificationModels from '../../apps/models/NotificationModels.js'
import ContentDetailsModels from '../../apps/models/ContentDetailsModels.js'

export const job = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Mulai update status conten detail...')

        try {
            updateStatusToEndedEvent()
            updateStatusToUpcomingEvent()
        } catch (error) {
            console.error('[CRON ERROR]', error)
        }
    }, {
        timezone: 'Asia/Jakarta'
    })
}

const updateStatusToEndedEvent = async () => {
    try {
        const query = `
                SELECT
                    * 
                FROM
                    ir_content_details 
                WHERE
                    to_timestamp( date_end ) < CURRENT_DATE AND status > 0
            `

        const users = await db.query(query, {
            type: db.QueryTypes.SELECT,
        })

        for (const user of users) {
            const { id } = user;
            await ContentDetailsModels.update(
                {
                    status: 0
                },
                {
                    where: {
                        id: id,
                    }
                }
            );
            console.log("Berhasil update status event")
        }
    } catch (error) {
        console.log("[error]", error)
        throw error;

    }
}

const updateStatusToUpcomingEvent = async () => {
    try {
        const query = `
                SELECT
                    * 
                FROM
                    ir_content_details 
                WHERE
                    to_timestamp( date_end ) < CURRENT_DATE AND status = 1
            `

        const users = await db.query(query, {
            type: db.QueryTypes.SELECT,
        })

        for (const user of users) {
            const { id } = user;
            await ContentDetailsModels.update(
                {
                    status: 2
                },
                {
                    where: {
                        id: id,
                    }
                }
            );
            console.log("Berhasil update status event upcoming")
        }
    } catch (error) {
        console.log("[error]", error)
        throw error;

    }
}