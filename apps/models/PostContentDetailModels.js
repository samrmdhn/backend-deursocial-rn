import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const PostContentDetailModels = db.define("ir_post_content_details", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    caption_post: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    caption_post_raw: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    slug: {
        type: TYPES.STRING(100),
        allowNull: false,
        unique: true
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
            key: "id",
        },
    },
    type: {
        type: TYPES.TINYINT,
        allowNull: false,
        description: "0: Global, 1: Segmented, 2: Ticket",
        defaultValue: 0,
        validate: {
            isIn: [[0, 1, 2]], // Hanya boleh 0, 1, 2 (0: Global, 1: Segmented, 2: Ticket)
        }
    },
    is_accepted: {
        type: TYPES.TINYINT,
        allowNull: false,
        description: "0: pending, 1: accepted, 2: not accepted",
        defaultValue: 0,
        validate: {
            isIn: [[0, 1, 2]],
        }
    },
    post_category: {
        type: TYPES.TINYINT,
        allowNull: false,
        description: "0: post, 1: moment",
        defaultValue: 0,
        validate: {
            isIn: [[0, 1]],
        }
    },
    is_official: {
        type: TYPES.TINYINT,
        allowNull: false,
        description: "0: community, 1: official (EO)",
        defaultValue: 0,
        validate: {
            isIn: [[0, 1]],
        }
    },
    groups_id: {
        type: TYPES.BIGINT,
        allowNull: true,
        references: {
            model: "ir_groups",
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

export default PostContentDetailModels;
