import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

dotenv.config({
    path: `./.env`,
});
const app = express();
app.use(
    cors({
        origins: [process.env.APP_FRONTEND, "http://localhost:3000"],
        credentials: true
    })
);

app.disable("x-powered-by");
app.disable("date");

app.use(express.json({ strict: false }));
app.use(cookieParser());
app.use(fileUpload());
app.use((req, res, next) => {
    res.removeHeader("Date");
    next();
});

const { default: api } = await import("./routes/api.js");
const { default: seed } = await import("./routes/seed.js");
app.use(api);
app.use(seed);

// Vercel serverless: export the app
export default app;
