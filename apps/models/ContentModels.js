import db from "../../configs/Database.js";
import DisplayTypesModels from "./DisplayTypesModels.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ContentModels = db.define(
    "ir_contents",
    {
        id: {
            type: TYPES.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: TYPES.STRING(100),
            allowNull: false,
        },
        slug: {
            type: TYPES.STRING(100),
            allowNull: false,
            unique: true
        },
        status: {
            type: TYPES.TINYINT,
            defaultValue: 0,
            description: "0: non active, 1: active",
            validate: {
                isIn: [[0, 1]], // Hanya boleh 1, 2 (1: men, 2: women)
            }
        },
        display_types_id: {
            type: TYPES.BIGINT,
            allowNull: false,
            references: {
                model: "ir_display_types",
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
    },
    {
        freezeTableName: true,
        timestamps: false,
    }
);
export default ContentModels;
