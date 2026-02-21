import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const FilePostContentDetailModels = db.define("ir_file_post_content_details", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    post_content_details_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_post_content_details",
            key: "id",
        },
    },
    file: {
        type: TYPES.STRING(100),
        allowNull: true,
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

export default FilePostContentDetailModels;
