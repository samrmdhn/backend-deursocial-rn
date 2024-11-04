import jwt from 'jsonwebtoken';
export const verifyToken = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.APP_KEY;
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(403).json({ message: 'Forbidden: Invalid API key' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Forbidden: can be access' });
    jwt.verify(token, process.env.APP_ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Forbidden' })
        req.email = decoded.email
        next();
    })
}
