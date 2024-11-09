import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ContentDetailsModels = db.define(
    "ir_content_details",
    {
        id: {
            type: TYPES.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: TYPES.STRING(100),
            allowNull: false, // Kolom title wajib (NOT NULL)
        },
        slug: {
            type: TYPES.STRING(100),
            allowNull: false,
            unique: true
        },
        schedule_start: {
            type: TYPES.BIGINT,
            allowNull: true, // Kolom ini bisa bernilai null
        },
        schedule_end: {
            type: TYPES.BIGINT,
            allowNull: true, // Kolom ini bisa bernilai null
        },
        date_start: {
            type: TYPES.BIGINT,
            allowNull: true, // Kolom ini bisa bernilai null
        },
        date_end: {
            type: TYPES.BIGINT,
            allowNull: true, // Kolom ini bisa bernilai null
        },
        description: {
            type: TYPES.TEXT(),
            allowNull: true, // Kolom ini bisa bernilai null
        },
        image: {
            type: TYPES.STRING(200),
            allowNull: true, // Kolom image bisa null
        },
        vanues_id: {
            type: TYPES.BIGINT,
            allowNull: false, // Foreign key, harus ada (NOT NULL)
            references: {
                model: "ir_vanues", // Tabel yang dirujuk
                key: "id", // Kolom yang dirujuk
            },
        },
        contents_id: {
            type: TYPES.BIGINT,
            allowNull: false, // Foreign key, harus ada (NOT NULL)
            references: {
                model: "ir_contents", // Tabel yang dirujuk
                key: "id", // Kolom yang dirujuk
            },
        },
        event_organizers_id: {
            type: TYPES.BIGINT,
            allowNull: false, // Foreign key, harus ada (NOT NULL)
            references: {
                model: "ir_event_organizers", // Tabel yang dirujuk
                key: "id", // Kolom yang dirujuk
            },
        },
        is_trending: {
            type: TYPES.TINYINT,
            allowNull: true, // Kolom ini bisa null
            validate: {
                isIn: [[0, 1]], // Hanya boleh 0 atau 1 (0: no trending, 1: yes trending)
            },
        },
        status: {
            type: TYPES.TINYINT,
            allowNull: true, // Kolom ini bisa null
            validate: {
                isIn: [[0, 1, 2]], // Hanya boleh 0, 1, atau 2 (0: ended, 1: ongoing, 2: upcoming)
            },
        },
        type_content_details_id: {
            type: TYPES.BIGINT,
            allowNull: false, // Foreign key, harus ada (NOT NULL)
            references: {
                model: "ir_type_content_details", // Tabel yang dirujuk
                key: "id", // Kolom yang dirujuk
            },
        },
        impression: {
            type: TYPES.BIGINT,
            allowNull: false,
            defaultValue: 0
        },
        created_at: {
            type: TYPES.BIGINT,
            allowNull: true, // Kolom ini bisa bernilai null
        },
        updated_at: {
            type: TYPES.BIGINT,
            allowNull: true, // Kolom ini bisa bernilai null
        },
    },
    {
        freezeTableName: true,
        timestamps: false, // Tidak otomatis menggunakan createdAt / updatedAt
    }
);

export default ContentDetailsModels;
