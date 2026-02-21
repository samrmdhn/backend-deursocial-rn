import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ProvincesModels = db.define("ir_provinces", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    countries_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_countries",
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

export default ProvincesModels;
