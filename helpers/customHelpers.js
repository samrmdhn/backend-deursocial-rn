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
        const transaction = await db.transaction(); // Mulai transaksi baru
        try {
            await fn(req, res, transaction); // Menjalankan fungsi, passing `transaction`
            await transaction.commit(); // Commit jika semua berhasil
        } catch (error) {
            await transaction.rollback(); // Rollback jika ada error
            console.error("Transaction Rolled Back Due to Error:", error);
            return responseApi(res, {
                data: [],
                message: "Server error occurred.",
                status: 1,
            });
        }
    };
};
