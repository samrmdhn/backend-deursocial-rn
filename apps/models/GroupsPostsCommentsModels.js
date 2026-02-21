import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const GroupsPostsCommentsModels = db.define("ir_groups_posts_comments", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    comment_posts: {
        type: TYPES.TEXT(),
        allowNull: true, // Kolom ini bisa bernilai null
    },
    group_posts_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_groups_posts",
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

export default GroupsPostsCommentsModels;
