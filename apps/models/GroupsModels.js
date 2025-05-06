import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const GroupsModels = db.define("ir_groups", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
            key: "id",
        },
    },
    description: {
        type: TYPES.TEXT(),
        allowNull: true, // Kolom ini bisa bernilai null
    },
    citys_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_citys",
            key: "id",
        },
    },
    content_details_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_content_details",
            key: "id",
        },
    },
    max_members: {
        type: TYPES.INTEGER
    },
    is_gender: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 0,
        validate: {
            isIn: [[0, 1, 2]], // Hanya boleh 0, 1, 2 (0: Unisex, 1: Men, 2: Women)
        },
    },
    is_anonymous: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 0,
        validate: {
            isIn: [[0, 1]], // Hanya boleh 0, 1 (0: non active anonymous, 1: active anonymous)
        },
    },
    is_private: {
        type: TYPES.TINYINT,
        defaultValue: 0,
        validate: {
            isIn: [[0, 1]], // Hanya boleh 0, 1 (0: no private, 1: yes private)
        },
    },
    status: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 1,
        validate: {
            isIn: [[0, 1, 2]], // Hanya boleh 0, 1, atau 2 (0: non active, 1: active/opened, 2: closed)
        },
    },
    password_join: {
        type: TYPES.STRING(6),
        allowNull: true // password join untuk user jika private
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

export default GroupsModels;
