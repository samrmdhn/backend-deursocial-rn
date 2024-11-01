import { Sequelize } from "sequelize";
import dotenv from 'dotenv';
dotenv.config({ path: `./.env` });
const db = new Sequelize(process.env.APP_DB_DATABASE, process.env.APP_DB_USERNAME, process.env.APP_DB_PASSWORD, {
    host: process.env.APP_DB_HOST,
    dialect: process.env.APP_DB_CONNECTION,
    port: process.env.APP_DB_PORT
});

export default db;