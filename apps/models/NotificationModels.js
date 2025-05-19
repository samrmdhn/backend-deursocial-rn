import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

/**
 * Notification Table Structure
 * 
 * ===> user_id: The ID of the user who receives the notification.
 * ===> message: A message explaining the content of the notification.
 * ===> source_id: The ID of the associated object (e.g., moment ID or group ID).
 * ===> type: The type of notification.
 *      type = {
 *          1 = User joins a group,
 *          2 = User likes a moment,
 *          3 = User comments on a moment
 *      }
 */

const NotificationModels = db.define("ir_notifications", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
            key: "id",
        },
    },
    source_id: {
        type: TYPES.BIGINT,
        allowNull: false,
    },
    type: {
        type: TYPES.TINYINT,
        defaultValue: 0
    },
    is_read: {
        type: TYPES.TINYINT,
        defaultValue: 0,
        description: "0: not yet read, 1: read",
        validate: {
            isIn: [[0, 1]]
        }
    },
    message: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    created_at: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
    updated_at: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
}, {
    freezeTableName: true,
    timestamps: false,
});

export default NotificationModels;
