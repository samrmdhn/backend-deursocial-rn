import db from "../configs/Database.js";
import { responseApi } from "../libs/RestApiHandler.js";

export const makeEpocTime = () => {
    const date = new Date();
    const options = { timeZone: "Asia/Jakarta" };
    const jakartaDate = new Intl.DateTimeFormat("en-US", options).format(date);
    const epochTimeJakarta = new Date(jakartaDate).getTime() / 1000;
    return epochTimeJakarta;
};

export const epochToDateJakarta = (epochTime) => {
    const milliseconds = epochTime * 1000;
    const date = new Date(milliseconds);
    const options = {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
    };
    const jakartaDate = new Intl.DateTimeFormat("en-US", options).format(date);
    return jakartaDate;
};

export const dateToEpochTime = (time) => {
    const date = new Date(time); // time is a Format ISO 8601 atau format yang didukung JavaScript
    const epochTimeInMilliseconds = date.getTime();

    return Math.floor(epochTimeInMilliseconds / 1000);
};

export const convertToSlug = (text) => {
    text = text.replace(/[^\w\s-]+/g, " ");
    text = text.replace(/\s+/g, " ");
    text = text.trim().replace(/ /g, "-");
    return text.toLowerCase();
};

export const withTransaction = (fn) => {
    return async (req, res) => {
        const transaction = await db.transaction();
        try {
            await fn(req, res, transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            console.error("Transaction Rolled Back Due to Error:", error);
            return responseApi(res, [], null, "Server error....", 1);
        }
    };
};

export const getExtension = (filename) => {
    var i = filename.lastIndexOf(".");
    return i < 0 ? "" : filename.substr(i);
};

export const createNameFile = (fileName) => {
    return "/images/" + fileName;
};

export const makeRandomString = (length) => {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
        counter += 1;
    }
    return result;
};

export const makeDataJwt = (req, userId = 0) => {
    var forwarded = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    var agent = req.headers["user-agent"];
    const encryptData = {
        tod: userId,
        uip: forwarded,
        uag: agent,
    };
    const datas = {
        ...encryptData,
    };
    return { datas: datas, forwarded: forwarded, agent: agent };
};
