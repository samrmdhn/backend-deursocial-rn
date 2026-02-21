import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ChatStatusGroupsModels = db.define("ir_chat_groups_status", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    groups_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_groups",
            key: "id",
        },
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
            key: "id",
        },
    },
    chat_groups_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_chat_groups",
            key: "id",
        },
    },
    status: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 1,
        validate: {
            isIn: [[0, 1]], // Hanya boleh 0, 1 (0: read, 1: unread)
        },
    },
    created_at: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
    updated_at: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
},     {
    freezeTableName: true,
    timestamps: false,
});

export default ChatStatusGroupsModels;
