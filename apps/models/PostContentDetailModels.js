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
    impression: {
        type: TYPES.BIGINT,
        allowNull: false,
        defaultValue: 0
    },
    users_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_users",
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
