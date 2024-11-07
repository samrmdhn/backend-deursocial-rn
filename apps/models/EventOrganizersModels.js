import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";
const { TYPES } = DataTypesCustom;

const EventOrganizersModels = db.define("ir_event_organizers", {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: TYPES.STRING(100),
        allowNull: false,
    },
    image: {
        type: TYPES.STRING(255),
        allowNull: true,
    },
    detail: {
        type: TYPES.TEXT(),
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
},{
    freezeTableName: true,
    timestamps: false,
});

export default EventOrganizersModels;
