import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ActressModels = db.define("ir_actress", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    image: {
        type: TYPES.STRING(255),
        allowNull: false, // Harus NOT NULL sesuai dengan dbdiagram
    },
    gender: {
        type: TYPES.TINYINT,
        allowNull: true,  // Gender bisa null, karena `birth_of_day` dan `detail` boleh null
        validate: {
            isIn: [[1, 2]], // Hanya boleh 1 atau 2 (1: Men, 2: Women)
        },
    },
    birth_of_day: {
        type: TYPES.DATE,
        allowNull: true, // Kolom ini bisa null sesuai dbdiagram
    },
    detail: {
        type: TYPES.TEXT(),
        allowNull: true, // Kolom ini juga boleh null sesuai dbdiagram
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
    timestamps: false, // Tidak menggunakan otomatisasi timestamps
});

export default ActressModels;
