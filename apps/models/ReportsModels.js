import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ReportsModels = db.define("ir_reports", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    description: {
        type: TYPES.TEXT(),
        allowNull: true, // Kolom ini bisa bernilai null
    },
    type: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 1,
        validate: {
            isIn: [[1, 2]], // Hanya boleh 0, 1(0: non active, 1: active)
        },
    },
    status: {
        type: TYPES.TINYINT,
        allowNull: true,
        defaultValue: 1,
        validate: {
            isIn: [[0, 1]], // Hanya boleh 0, 1(0: non active, 1: active)
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
}, {
    freezeTableName: true,
    timestamps: false,
});

export default ReportsModels;
