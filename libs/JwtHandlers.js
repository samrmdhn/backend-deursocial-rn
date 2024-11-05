import jwt from "jsonwebtoken";


/**
 * this object token and in bracket is a field on database
 * tod = tanda id users jika 0 berarti visitor token jika tidak 0 maka user (mark_user_id)
 * uip = IP user (user_ip)
 * uag = user agen(user_agent)
 * 
 * @param {*} data 
 * @returns 
 */
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
        expiresIn: "7d",
    });
};
