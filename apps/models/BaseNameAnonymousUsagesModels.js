import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const BaseNameAnonymousUsagesModels = db.define("ir_base_name_anonymous_user_usages", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    total: {
        type: TYPES.INTEGER
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

export default BaseNameAnonymousUsagesModels;
