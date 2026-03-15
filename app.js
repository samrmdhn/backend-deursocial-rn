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

// Debug: catch import errors
app.get('/debug', (req, res) => {
    res.json({
        status: 'app loaded',
        env: {
            DB_HOST: process.env.APP_DB_HOST || 'NOT SET',
            DB_DATABASE: process.env.APP_DB_DATABASE || 'NOT SET',
            DB_USERNAME: process.env.APP_DB_USERNAME || 'NOT SET',
            DB_CONNECTION: process.env.APP_DB_CONNECTION || 'NOT SET',
            DB_PORT: process.env.APP_DB_PORT || 'NOT SET',
        }
    });
});

// Load routes with error catching
try {
    const { default: api } = await import("./routes/api.js");
    app.use(api);
} catch (err) {
    app.use('/', (req, res) => {
        res.status(500).json({
            error: 'Failed to load routes',
            message: err.message,
            stack: err.stack
        });
    });
}

// Vercel serverless: export the app
export default app;
