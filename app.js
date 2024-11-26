import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import api from "./routes/api.js";
import fileUpload from "express-fileupload";
// const { Server } = require('socket.io');
import { Server } from "socket.io";
import { initializeSocket } from "./apps/controllers/ChatGroupsControllers.js";

dotenv.config({
    path: `./.env`,
});
const app = express();
app.use(
    cors({
        credentials: true,
        origins: [process.env.APP_FRONTEND, "http://localhost:3000"],
    })
);

// app.use(express.json());
app.disable("x-powered-by");
app.disable("date");

app.use(express.json({ strict: false }));
app.use(cookieParser());
app.use(fileUpload());
app.use((req, res, next) => {
    res.removeHeader("Date");
    next();
});
app.use(api);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origins: [
            process.env.APP_FRONTEND,
            "http://localhost:3000",
            "http://localhost:5731",
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    },
});
initializeSocket(io);

httpServer.listen(process.env.APP_PORT, process.env.APP_HOST, function () {
    console.log("Started application on port %d", process.env.APP_PORT);
});
