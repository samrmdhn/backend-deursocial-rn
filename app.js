import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { CronJobs } from "./libs/cron/index.js";

dotenv.config({
    path: `./.env`,
});
const app = express();
app.use(
    cors({
        origins: [process.env.APP_FRONTEND, "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
        credentials: true
    })
);

app.disable("x-powered-by");
app.disable("date");

app.use(express.json({ strict: false }));
app.use(cookieParser());
app.use(fileUpload());
app.use((_req, res, next) => {
    res.removeHeader("Date");
    next();
});

await CronJobs()
const server = app.listen(parseInt(process.env.APP_PORT), process.env.APP_HOST, function () {
    console.log("Started application on port %d", process.env.APP_PORT);
});
server.on('error', (err) => {
    console.error('Server error:', err);
});
