import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const CitysModels = db.define("ir_citys", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    provinces_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_provinces",
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
});

export default CitysModels;
