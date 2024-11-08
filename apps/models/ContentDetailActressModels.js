import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const ContentDetailActressModels = db.define("ir_content_detail_actress", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    actress_id: {
        type: TYPES.BIGINT,
        allowNull: false,
        references: {
            model: "ir_actress",
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

export default ContentDetailActressModels;
