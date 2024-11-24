import db from "../configs/Database.js";
import { responseApi } from "../libs/RestApiHandler.js";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { jwtDecode } from "jwt-decode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const makeEpocTime = (inputDate='') => {
    const date = inputDate !== '' ? new Date(inputDate) : new Date();
    const options = { timeZone: "Asia/Jakarta", hour12: false };
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

export const downloadImage = (urlImage) => {
    return new Promise((resolve, reject) => {
        try {
            if (!urlImage) {
                return resolve({
                    image: "",
                    filePath: "",
                });
            }

            const targetDirectory = process.env.APP_LOCATION_FILE;
            const name = `${Date.now()}.jpg`;
            const nameFile = createNameFile(name);

            const filePath = path.join(targetDirectory, nameFile);

            if (!fs.existsSync('images')) {
                fs.mkdirSync('images', { recursive: true });
            }

            const client = urlImage.startsWith("https") ? https : http;

            const file = fs.createWriteStream(filePath);
            client.get(urlImage, (response) => {
                    if (response.statusCode !== 200) {
                        return resolve({
                            image: "",
                            filePath: "",
                        });
                    }

                    response.pipe(file);

                    file.on("finish", () => {
                        file.close(); // Menutup file stream
                        resolve({
                            image: nameFile,
                            filePath,
                        });
                    });
                })
                .on("error", (err) => {
                    fs.unlink(filePath, () => {}); // Hapus file jika terjadi kesalahan
                    console.error("Error downloading image:", err);
                    resolve({
                        image: "",
                        filePath: "",
                    });
                });
        } catch (error) {
            console.error("Error:", error);
            resolve({
                image: "",
                filePath: "",
            });
        }
    });
};

export const getDataUserUsingToken = (req) => {
    let token = req.headers["authorization"];
    if (token && token.startsWith("Bearer ")) {
        const dataToken = jwtDecode(token.slice(7));
        if (Number(dataToken.tod) === 0) {
            return res.status(400).send("Sorry.....!");
        }
        return dataToken;
    }
}