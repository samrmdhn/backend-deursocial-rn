import jwt from "jsonwebtoken";
import { jwtDecode } from "jwt-decode";
import UsersModels from "../models/UsersModels.js";

const isDev = process.env.APP_MODE !== "production";

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    const validApiKey = process.env.APP_KEY;
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(403).json({ message: "Forbidden: Invalid API key" });
    }
    next();
};

const validateToken = (req, res, next) => {
    res.removeHeader("Date");
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Forbidden: access denied" });
    }
    // In development, skip signature verification so production tokens work locally
    if (isDev) {
        try {
            const decoded = jwtDecode(token);
            req.user = decoded;
            return next();
        } catch (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
    }
    jwt.verify(token, process.env.APP_ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.error("JWT Error:", err.message);
            return res
                .status(403)
                .json({ message: "Invalid or expired token" });
        }
        req.user = decoded;
        next();
    });
};

const CANCEL_DELETE_URL = "/api/user/cancel-delete";

export const verifyToken = (req, res, next) => {
    const excludedUrls = ["/api/kadieu"];
    if (excludedUrls.includes(req.originalUrl)) {
        return next();
    }
    if (!req.headers["x-date-for"]) {
        return res
            .status(403)
            .json({ message: "Whats wrong dude? jajajajaja" });
    }
    validateApiKey(req, res, () => {
        validateToken(req, res, async () => {
            // Allow cancel-delete through even if account is pending deletion
            if (req.originalUrl.startsWith(CANCEL_DELETE_URL)) {
                return next();
            }
            try {
                const userId = req.user?.tod;
                if (userId) {
                    const user = await UsersModels.findOne({ where: { id: userId }, attributes: ["is_deleted", "scheduled_hard_delete_at"] });
                    if (user?.is_deleted === 1) {
                        const now = Math.floor(Date.now() / 1000);
                        if (user.scheduled_hard_delete_at && now > user.scheduled_hard_delete_at) {
                            return res.status(401).json({ message: "Account has been deleted", code: "account_deleted" });
                        }
                        return res.status(403).json({
                            message: "Account pending deletion",
                            code: "account_pending_deletion",
                            scheduled_hard_delete_at: new Date(user.scheduled_hard_delete_at * 1000).toISOString(),
                        });
                    }
                }
            } catch (err) {
                console.error("[verifyToken] deleted check error:", err);
            }
            next();
        });
    });
};
