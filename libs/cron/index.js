import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const CronJobs = async () => {
    const fileExclude = ["emailNotification", "notificationToEmailUser"];
    const cronFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js' && !fileExclude.includes(file.replace('.js', '')))

    for (const file of cronFiles) {
        const modulePath = path.join(__dirname, file)
        const cronModule = await import(modulePath)

        if (typeof cronModule.job === 'function') {
            cronModule.job()
            console.log(`Cron dimulai dari: ${file}`)
        }
    }
}
