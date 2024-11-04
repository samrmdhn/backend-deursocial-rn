import jwt from "jsonwebtoken";

export const signVisitorToken = (data) => {
    return jwt.sign(data, process.env.APP_ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
    });
};
