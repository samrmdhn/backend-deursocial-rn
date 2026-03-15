import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const EventPostsModels = db.define("ir_event_posts", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    caption: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    caption_raw: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    slug: {
        type: TYPES.STRING(100),
        allowNull: false,
        unique: true
    },
    content_details_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_content_details",
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
    post_type: {
        type: TYPES.TINYINT,
        allowNull: false,
        description: "0: community, 1: official (EO)",
        defaultValue: 0,
        validate: {
            isIn: [[0, 1]],
        }
    },
    is_accepted: {
        type: TYPES.TINYINT,
        allowNull: false,
        description: "0: pending, 1: accepted, 2: rejected",
        defaultValue: 1,
        validate: {
            isIn: [[0, 1, 2]],
        }
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

export default EventPostsModels;
