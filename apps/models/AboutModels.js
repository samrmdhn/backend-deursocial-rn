import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const AboutModels = db.define("ir_abouts", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    description: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    type: {
        type: TYPES.TINYINT,
        defaultValue: 1,
        description: "1: Terms & condition, 2: privacy policy"
    },
    created_at: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
    updated_at: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
}, {
    freezeTableName: true,
    timestamps: false,
});

export default AboutModels;
