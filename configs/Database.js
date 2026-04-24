import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config({ path: `./.env` });

const _require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-warm CJS cache so Sequelize's internal require('pg') finds it
let pg;
try {
    pg = _require("pg");
} catch (_) { /* will fall back to dialectModulePath */ }

const isSupabase = (process.env.APP_DB_HOST || "").includes("supabase.co");

const db = new Sequelize(
    process.env.APP_DB_DATABASE,
    process.env.APP_DB_USERNAME,
    process.env.APP_DB_PASSWORD,
    {
        host: process.env.APP_DB_HOST,
        dialect: process.env.APP_DB_CONNECTION,
        port: process.env.APP_DB_PORT,
        // dialectModulePath is an absolute path — Sequelize does require(absPath)
        // which works even when nft strips normal module resolution
        dialectModulePath: resolve(__dirname, "../node_modules/pg"),
        ...(pg && { dialectModule: pg }),
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
