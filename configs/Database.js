import { createRequire } from "module";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// createRequire loads pg via CJS require(), which:
// 1. pre-populates the CJS module cache (so Sequelize's internal require('pg') finds it)
// 2. gives us the exact object Sequelize expects for dialectModule
const _require = createRequire(import.meta.url);
const pg = _require("pg");
dotenv.config({ path: `./.env` });
const isSupabase = (process.env.APP_DB_HOST || "").includes("supabase.co");

const db = new Sequelize(
    process.env.APP_DB_DATABASE,
    process.env.APP_DB_USERNAME,
    process.env.APP_DB_PASSWORD,
    {
        host: process.env.APP_DB_HOST,
        dialect: process.env.APP_DB_CONNECTION,
        port: process.env.APP_DB_PORT,
        dialectModule: pg,
        pool: {
            max: 40,
            min: 0,
            acquire: 120000,
            idle: 10000,
        },
        ...(isSupabase && {
            dialectOptions: {
                ssl: { require: true, rejectUnauthorized: false },
            },
        }),
        // logging: process.env.APP_MODE === 'production' ?? false
    },
);

export default db;
