import NotificationModels from "../apps/models/NotificationModels.js";

/**
 * 
 * const username = 'john_doe'; // Username pengguna yang menerima notifikasi
 * const type; // Tipe notifikasi (1 =  join groups, 2 =  liked moment, 3 = comment moment, 4 = Follow,
 * 5 = join group private)
 * const message = generateNotificationMessage(type, username);
 */
export const generateNotificationMessage = async ({ type, users_id, source_id, created_at, message = "" }) => {
    try {
        switch (type) {
            case 1: // Join groups
                message = `joined your group.`;
                break;
            case 2: // Like moments
                message = `liked your moment.`;
                break;
            case 3: // Comment moments
                message = `commented on your moment.`;
                break;
            case 4: // Follow
                message = `started following you.`;
                break;
            case 5: // Join Group Private
                message = `need aproval join your group.`;
                break;
            case 6: // Like moments
                message = `liked your post.`;
                break;
            case 7: // Comment moments
                message = `commented on your post.`;
                break;
            default:
                message = "Unknown notification type.";
                break;
        }
        const validation = await NotificationModels.findOne({
            where: {
                users_id: users_id,
                source_id: source_id,
                type: type
            }
        })
        if (!validation) {
            await NotificationModels.create({
                users_id: users_id,
                source_id: source_id,
                message: message,
                type: type,
                created_at: created_at
            })
        }
        return true;

    } catch (error) {
        console.log("[ERROR] generate notification", error)
        return false
    }
}

