import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const GroupsPostsModels = db.define("ir_groups_posts", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    caption_post: {
        type: TYPES.TEXT(),
        allowNull: true, // Kolom ini bisa bernilai null
    },
    photo: {
        type: TYPES.STRING(500),
        allowNull: true,
    },
    content_details_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_content_details",
            key: "id",
        },
    },
    groups_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_groups",
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

export default GroupsPostsModels;
