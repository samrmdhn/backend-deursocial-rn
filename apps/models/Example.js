import db from "../../configs/Database.js";
import DataTypesCustom from "../../libs/DataTypesCustom.js";

const {
    TYPES
} = DataTypesCustom;

const Example = db.define('ir_company', {
    id: {
        type: TYPES.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    company_name: {
        type: TYPES.STRING(50),
        allowNull: false
    },
    created_by: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
    updated_by: {
        type: TYPES.BIGINT,
        allowNull: true,
    },
}, {
    freezeTableName: true
})

export default Example;