import { makeEpocTime } from "../../helpers/customHelpers.js";
import { signVisitorToken } from "../../libs/JwtHandlers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import UsersActivityModels from "../models/UsersActivityModels.js";
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
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60); 
        var configFindAll = {
            attributes: [
                "id"
            ],
            where: {
                user_ip: forwarded,
                created_at: {
                    [Op.lt]: sevenDaysAgo // Mencari data yang lebih lama dari 7 hari
                }
            }
        }
        const visitorToken = signVisitorToken(datas)
        const dataUser = await UsersActivityModels.findOne(configFindAll);
        if (!dataUser) {
            const newData = await UsersActivityModels.create({
                created_at: makeEpocTime(),
                user_ip: forwarded,
                user_agent: agent,
                mark_user_id: 0,
                access_token: visitorToken
            });
            console.log("Data baru berhasil dibuat:", newData);
        } else {
            console.log("Data ditemukan:", dataUser);
        }
        return responseApi(res, {
            data: {
                access_token: visitorToken,
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
