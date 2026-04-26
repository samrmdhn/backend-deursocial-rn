import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const SubregionsModels = db.define("ir_subregions", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    regions_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_regions",
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

export default SubregionsModels;
// vercel-fix
