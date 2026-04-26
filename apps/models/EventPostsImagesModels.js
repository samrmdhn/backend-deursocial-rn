import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const EventPostsImagesModels = db.define("ir_event_posts_images", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    event_posts_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_event_posts",
            key: "id",
        },
    },
    image_url: {
        type: TYPES.STRING(255),
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
},     {
    freezeTableName: true,
    timestamps: false,
});

export default EventPostsImagesModels;
