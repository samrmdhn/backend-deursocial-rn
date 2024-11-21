import express from "express";
import cors from "cors";
import http from 'http';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import api from "./routes/api.js";
import fileUpload from "express-fileupload";
// const { Server } = require('socket.io');
import { Server } from "socket.io";


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

// app.use(express.json());

app.use(express.json({strict: false}));
app.use(cookieParser());
app.use(fileUpload());
app.use(api);



const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' },
});
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User bergabung ke grup
    socket.on('joinGroup', (groupId) => {
        socket.join(groupId);
        console.log(`User joined group: ${groupId}`);
    });

    // Membersihkan listener saat user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

httpServer.listen(process.env.APP_PORT, process.env.APP_HOST, function () {
    console.log("Started application on port %d", process.env.APP_PORT)
});