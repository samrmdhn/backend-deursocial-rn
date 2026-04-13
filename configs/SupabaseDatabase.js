import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config({ path: `./.env` });

// Use IPv6 address directly if hostname doesn't resolve (common on some local networks)
const dbHost = process.env.SUPABASE_DB_HOST_IPV6 || process.env.SUPABASE_DB_HOST;

const sdb = new Sequelize(
    process.env.SUPABASE_DB_DATABASE,
    process.env.SUPABASE_DB_USERNAME,
    process.env.SUPABASE_DB_PASSWORD,
    {
        host: dbHost,
        dialect: "postgres",
        port: parseInt(process.env.SUPABASE_DB_PORT || "5432"),
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
        logging: false,
    },
);

export default sdb;
