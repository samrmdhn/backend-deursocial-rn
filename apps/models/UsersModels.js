import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";

const { TYPES } = DataTypesCustom;

const UsersModels = db.define(
    "ir_users",
    {
        id: {
            type: TYPES.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        display_name: {
            type: TYPES.STRING(100),
            allowNull: false,
        },
        display_name_anonymous: {
            type: TYPES.STRING(100),
            allowNull: true,
        },
        photo: {
            type: TYPES.STRING(100),
            allowNull: true,
        },
        description: {
            type: TYPES.TEXT("long"),
            allowNull: true,
        },
        email: {
            type: TYPES.STRING(100),
            allowNull: false,
            unique: true,
        },
        phone: {
            type: TYPES.STRING(100),
            allowNull: true,
            unique: true,
        },
        username: {
            type: TYPES.STRING(100),
            allowNull: false,
            unique: true,
        },
        username_anonymous: {
            type: TYPES.STRING(100),
            allowNull: false,
            unique: true,
        },
        password: {
            type: TYPES.STRING(100),
            allowNull: false,
        },
        gender: {
            type: TYPES.TINYINT,
            allowNull: true,
            description: "1: men, 2: women",
            validate: {
                isIn: [[1, 2]], // Hanya boleh 1, 2 (1: men, 2: women)
            }
        },
        is_verified: {
            type: TYPES.TINYINT,
            allowNull: true,
            description: "0: not verified, 1: verified",
            defaultValue: 0,
            validate: {
                isIn: [[0, 1]]
            }
        },
        date_of_birth: {
            type: TYPES.BIGINT,
            allowNull: true,
        },
        referal_code: {
            type: TYPES.STRING(5),
            allowNull: true,
        },
        coins: {
            type: TYPES.INTEGER,
            defaultValue: 0,
        },
        status: {
            type: TYPES.TINYINT,
            defaultValue: 1,
            description: "0: non active, 1: active",
        },
        is_anonymous: {
            type: TYPES.TINYINT,
            allowNull: true,
            defaultValue: 0,
            validate: {
                isIn: [[0, 1]], // Hanya boleh 0, 1 (0: non active anonymous, 1: active anonymous)
            },
        },
        created_by: {
            type: TYPES.BIGINT,
            allowNull: true,
        },
        updated_by: {
            type: TYPES.BIGINT,
            allowNull: true,
        },
    },
    {
        freezeTableName: true,
        indexes: [
            {
                name: "referal_code",
                fields: ["referal_code"],
            },
            {
                name: "username",
                fields: ["username"],
            },
        ],
        timestamps: false,
    }
);

export default UsersModels;
