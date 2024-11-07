import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const CountriesModels = db.define("ir_countries", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    subregions_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_subregions",
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
},{
    freezeTableName: true,
    timestamps: false,
});

export default CountriesModels;
