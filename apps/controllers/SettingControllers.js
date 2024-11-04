import { signVisitorToken } from "../../libs/JwtHandlers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import UsersModels from "../models/UsersModels.js";
import { Sequelize } from "sequelize";
const Op = Sequelize.Op;

export const getUsers = async (req, res) => {
    try {
        const users = await UsersModels.findAll();
        return responseApi(res, {
            data: userss,
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
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
    }
};

export const visitorToken = async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const reqIp = req.ip;

    console.log({ forwarded, reqIp });
    return responseApi(res, {
        message: { forwarded, reqIp },
    });
    // X-Forwarded-For
    // signVisitorToken()
};
