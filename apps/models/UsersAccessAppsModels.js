import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const {
    TYPES
} = DataTypesCustom

/**
 * field on this table
 * id bigint [increment, pk]
 * mark_user_id bigint
 * access_token varchar(255)
 * user_agent varchar(255)
 * user_ip varchar(100)
 * created_at bigint
 * updated_at bigint
 */
const UsersAccessAppsModels = db.define('ir_user_access_apps', {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    mark_user_id: {
        type: TYPES.BIGINT,
        allowNull: false
    },
    access_token: {
        type: TYPES.TEXT(),
        allowNull: false
    },
    user_agent: {
        type: TYPES.STRING(255),
        allowNull: false
    },
    user_ip: {
        type: TYPES.STRING(100),
        allowNull: false
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
    timestamps: false
})
export default UsersAccessAppsModels