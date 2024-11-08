import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ContentDetailTagsModels = db.define("ir_content_detail_tags", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    tags_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_tags",
            key: "id",
        },
    },
    content_details_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_content_details",
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

export default ContentDetailTagsModels;
