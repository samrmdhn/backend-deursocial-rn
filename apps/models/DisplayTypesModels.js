import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
import ContentModels from "./ContentModels.js";
const { TYPES } = DataTypesCustom;

const DisplayTypesModels = db.define(
    "ir_display_types",
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
        status: {
            type: TYPES.TINYINT,
            defaultValue: 1,
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

export default DisplayTypesModels;
