import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const GroupMembersModels = db.define("ir_group_members", {
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
    status: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 1,
        validate: {
            isIn: [[1, 2, 3]], // Hanya boleh 1, 2, 3 (1: joined, 2: need approval, 3: blocked)
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

export default GroupMembersModels;
