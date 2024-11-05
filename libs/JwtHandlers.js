import jwt from "jsonwebtoken";

export const signVisitorToken = (data) => {
    // const encryptData = {
    //     tod: 1, // id user jika 0 maka visitor jika lebih dari 1 maka users,
    //     uip: "192.158.23.433", // ip user akses
    //     uag: "agent",
    // };
    // const datas = {
    //     ...encryptData,
    //     token: btoa(JSON.stringify(encryptData)+process.env.APP_ACCESS_TOKEN_SECRET),
    // };
    return jwt.sign(data, process.env.APP_ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
    });
};
