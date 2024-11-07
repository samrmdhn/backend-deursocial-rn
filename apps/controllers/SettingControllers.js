import { makeEpocTime } from "../../helpers/customHelpers.js";
import { signVisitorToken } from "../../libs/JwtHandlers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import CitysModels from "../models/CitysModels.js";
import UsersAccessAppsModels from "../models/UsersAccessAppsModels.js";
import UsersModels from "../models/UsersModels.js";
import { Sequelize } from "sequelize";
import VanuesModels from "../models/VanuesModels.js";
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
        console.log("error", error);
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
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // Menghitung waktu 7 hari yang lalu
        const now = Math.floor(Date.now() / 1000); // Waktu saat ini

        var configFindAll = {
            attributes: ["id", "access_token"],
            where: {
                user_ip: forwarded,
                created_at: {
                    [Op.gt]: sevenDaysAgo, // Data yang dibuat lebih besar dari 7 hari yang lalu
                    [Op.lt]: now, // Data yang dibuat lebih kecil dari waktu saat ini
                },
            },
        };

        const dataUser = await UsersAccessAppsModels.findOne(configFindAll);
        var visitorToken = "";
        if (!dataUser) {
            visitorToken = signVisitorToken(datas);
            try {
                await UsersAccessAppsModels.create({
                    created_at: makeEpocTime(),
                    user_ip: forwarded,
                    user_agent: agent,
                    mark_user_id: 0,
                    access_token: visitorToken,
                });
            } catch (error) {
                throw new Error("error");
            }
        } else {
            visitorToken = dataUser?.access_token;
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

export const getCitys = async (req, res) => {
    try {
        const { page = 1, limit = 10, title = "", provinces_id = 1 } = req.query;
        const offset = (page - 1) * limit;
        const where = {
            provinces_id: provinces_id ? provinces_id : 1,
        };
        if (title) {
            where.title = {
                [Op.iLike]: `%${title}%`,
            };
        }
        const contentData = await CitysModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "provinces_id"],
            }
        });
        const totalCount = await CitysModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title
        }));
        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
    }
};
export const createCitys = async (req, res) => {
    try {
        const { title, provinces_id } = req.body;
        await CitysModels.create({
            title: title,
            provinces_id: provinces_id,
            created_at: makeEpocTime(),
        });
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
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

export const getVanues = async (req, res) => {
    try {
        const { page = 1, limit = 10, title = "", citys_id = 1 } = req.query;
        const offset = (page - 1) * limit;
        const where = {
            citys_id: citys_id ? citys_id : 1,
        };
        if (title) {
            where.title = {
                [Op.iLike]: `%${title}%`,
            };
        }
        const contentData = await VanuesModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "citys_id"],
            }
        });
        const totalCount = await VanuesModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title
        }));
        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
    }
};
export const createVanues = async (req, res) => {
    try {
        const { title, citys_id } = req.body;
        await VanuesModels.create({
            title: title,
            citys_id: citys_id,
            created_at: makeEpocTime(),
        });
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
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
