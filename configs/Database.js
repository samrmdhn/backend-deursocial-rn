import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config({ path: `./.env` });

const __dirname = dirname(fileURLToPath(import.meta.url));
// pg-module.cjs is a CJS file — nft can statically trace its require('pg')
// and Sequelize uses dialectModulePath to require it by absolute path
const pgModulePath = resolve(__dirname, "../pg-module.cjs");

const isSupabase = (process.env.APP_DB_HOST || "").includes("supabase.co");

const db = new Sequelize(
    process.env.APP_DB_DATABASE,
    process.env.APP_DB_USERNAME,
    process.env.APP_DB_PASSWORD,
    {
        host: process.env.APP_DB_HOST,
        dialect: process.env.APP_DB_CONNECTION,
        port: process.env.APP_DB_PORT,
        dialectModulePath: pgModulePath,
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
