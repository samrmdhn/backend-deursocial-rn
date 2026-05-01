import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const EventPostersModels = db.define(
    "ir_event_posters",
    {
        id: {
            type: TYPES.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        content_details_id: {
            type: TYPES.BIGINT,
            allowNull: false,
            references: {
                model: "ir_content_details",
                key: "id",
            },
        },
        image_url: {
            type: TYPES.STRING(200),
            allowNull: false,
        },
        created_at: {
            type: TYPES.BIGINT,
            allowNull: true,
        },
    },
    {
        freezeTableName: true,
        timestamps: false,
    }
);

export default EventPostersModels;
