import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config({
    path: `./.env`,
});

const { DataTypes } = Sequelize;

class DataTypesCustom {
    static TYPES = {
        INTEGER: DataTypes.INTEGER,
        TINYINT:
            process.env.APP_DB_CONNECTION === "postgres"
                ? DataTypes.SMALLINT
                : DataTypes.TINYINT,
        BIGINT: DataTypes.BIGINT,
        STRING: (length = 255) => DataTypes.STRING(length),
        TEXT: (length = "medium") => {
            switch (length) {
                case process.env.APP_DB_CONNECTION === "postgres":
                    return DataTypes.TEXT;
                case "tiny":
                    return DataTypes.TEXT("tiny");
                case "medium":
                    return DataTypes.TEXT("medium");
                case "long":
                    return DataTypes.TEXT("long");
                default:
                    return DataTypes.TEXT;
            }
        },
        DECIMAL: (precision = 10, scale = 2) =>
            DataTypes.DECIMAL(precision, scale),
        BOOLEAN: DataTypes.BOOLEAN,
        DATE: DataTypes.DATE,
        DATEONLY: DataTypes.DATEONLY,
        JSON: DataTypes.JSON,
        JSONB:
            process.env.APP_DB_CONNECTION === "postgres"
                ? DataTypes.JSONB
                : DataTypes.JSON,
        UUID: DataTypes.UUID,
        UUIDV4: DataTypes.UUIDV4,
        ENUM: (...values) => DataTypes.ENUM(...values),
        ARRAY: (type) => {
            if (process.env.APP_DB_CONNECTION === "postgres") {
                return DataTypes.ARRAY(type);
            }
            throw new Error("ARRAY type is only supported in postgres");
        },
        GEOGRAPHY: (type, srid = 4326) => {
            if (process.env.APP_DB_CONNECTION === "postgres") {
                return DataTypes.GEOGRAPHY(type, srid);
            }
            throw new Error("GEOGRAPHY type is only supported in postgres");
        },
        GEOMETRY: (type, srid = 4326) => {
            if (process.env.APP_DB_CONNECTION === "postgres") {
                return DataTypes.GEOMETRY(type, srid);
            }
            throw new Error("GEOMETRY type is only supported in postgres");
        },
    };
}

export default DataTypesCustom;
