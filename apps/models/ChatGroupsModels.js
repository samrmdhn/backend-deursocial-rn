import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ChatGroupsModels = db.define("ir_chat_groups", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    messages: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    groups_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_groups",
            key: "id",
        },
    },
    file: {
        type: TYPES.STRING(100),
        allowNull: true,
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
            key: "id",
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

export default ChatGroupsModels;
