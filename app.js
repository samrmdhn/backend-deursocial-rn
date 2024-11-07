import express from "express";
import cors from "cors";
import http from 'http';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import api from "./routes/api.js";


dotenv.config({
    path: `./.env`
});
const app = express();
app.use(cors({
    credentials: true,
    origins: [
        process.env.APP_FRONTEND,
        "http://localhost:3000"
    ]
}));
app.use(cookieParser());
// app.use(express.json());
app.use(express.json({strict: false}));

app.use(api);

const httpServer = http.createServer(app);

httpServer.listen(process.env.APP_PORT, process.env.APP_HOST, function () {
    console.log("Started application on port %d", process.env.APP_PORT)
});