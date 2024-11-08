import jwt from "jsonwebtoken";
export const verifyToken = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    const validApiKey = process.env.APP_KEY;
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(403).json({ message: "Forbidden: Invalid API key" });
    }
    const token = req.headers["authorization"]; 
    validationToken(req, res, next, token);
};
const validationToken = (req, res, next, token) => {
    const fullUrl = req.originalUrl;
    const agent = req.headers['user-agent'];
    console.log("agent", agent);

    if (fullUrl === "/api/kadieu") {
        next();
    } else {
        if (!token) {
            return res.status(401).json({ message: "Forbidden: access denied" });
        }
        jwt.verify(
            token,
            process.env.APP_ACCESS_TOKEN_SECRET,
            (err, decoded) => {
                if (err) {
                    return res.status(403).json({ message: "Forbidden" });
                }
                next();
            }
        );
    }
};
