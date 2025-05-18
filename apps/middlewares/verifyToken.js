import jwt from "jsonwebtoken";

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
        validateToken(req, res, next);
    });
};
