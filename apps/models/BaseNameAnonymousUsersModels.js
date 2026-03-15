import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const BaseNameAnonymousUsersModels = db.define("ir_base_name_anonymous_users", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    type: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 1,
        validate: {
            isIn: [[1, 2, 3]], // Hanya boleh 1, 2, 3 ("1: animal, 2: fnb, 3: characteristic")
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

export default BaseNameAnonymousUsersModels;
// vercel-fix
