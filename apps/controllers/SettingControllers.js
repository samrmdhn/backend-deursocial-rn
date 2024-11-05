import { signVisitorToken } from "../../libs/JwtHandlers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import UsersModels from "../models/UsersModels.js";
import { Sequelize } from "sequelize";
const Op = Sequelize.Op;

export const getUsers = async (req, res) => {
    try {
        const users = await UsersModels.findAll();
        return responseApi(res, {
            data: users,
            meta: {
                assets_image_url: "https://google.com",
                pagination: {
                    current_page: 0,
                    per_page: 0,
                    total: 0,
                    total_page: 0,
                },
            },
            status: {
                code: 0,
                message_client: "Data has been retrieved",
            },
        });
    } catch (error) {
        console.log("error", error)
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
    }
};

export const visitorToken = async (req, res) => {
    try {
        var forwarded =
            req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        var agent = req.headers["user-agent"];
        const encryptData = {
            tod: 0,
            uip: forwarded,
            uag: agent,
        };
        const datas = {
            ...encryptData,
            token: btoa(
                JSON.stringify(encryptData) +
                    process.env.APP_ACCESS_TOKEN_SECRET
            ),
        };
        return responseApi(res, {
            data: {
                access_token: signVisitorToken(datas),
            },
            status: {
                code: 0,
                message_client: "Data has been retrieved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
    }
};
