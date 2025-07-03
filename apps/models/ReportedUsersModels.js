import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

/**
 * this model for users reported
 */
const ReportedUsersModels = db.define("ir_reported_users", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    description: {
        type: TYPES.TEXT(),
        allowNull: true, // Kolom ini bisa bernilai null
    },
    reports_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_reports",
            key: "id",
        },
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
            key: "id",
        },
    },
    source_id: {
        type: TYPES.BIGINT,
        allowNull: false,
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

export default ReportedUsersModels;
