import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const CommentPostContentDetailModels = db.define("ir_comment_post_content_details", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    comment_post: {
        type: TYPES.TEXT("long"),
        allowNull: true,
    },
    post_content_details_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_post_content_details",
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

export default CommentPostContentDetailModels;
