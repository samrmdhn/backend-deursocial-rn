import { makeEpocTime } from "../../helpers/customHelpers.js";
import { signVisitorToken } from "../../libs/JwtHandlers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import CitysModels from "../models/CitysModels.js";
import UsersAccessAppsModels from "../models/UsersAccessAppsModels.js";
import UsersModels from "../models/UsersModels.js";
import { Sequelize } from "sequelize";
import VanuesModels from "../models/VanuesModels.js";
import { getPagination } from "../../helpers/paginationHelpers.js";
import { buildWhereClause } from "../../helpers/queryBuilderHelpers.js";
const Op = Sequelize.Op;

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

        return responseApi(
            res,
            {
                access_token: visitorToken,
            },
            null,
            "Data has been retrieved",
            0
        );
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const getCitys = async (req, res) => {
    try {
        const { page = 1, title = "", provinces_id = 1 } = req.query;
        const where = { provinces_id: provinces_id };
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await CitysModels.count({
                where: buildWhereClause(where, "title", title),
            })
        );

        const contentData = await CitysModels.findAll({
            where: buildWhereClause(where, "title", title),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at", "provinces_id"],
            },
        });

        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title,
        }));

        return responseApi(res, responseData, {
            assets_image_url: "https://google.com",
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: contentData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
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
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const getVanues = async (req, res) => {
    try {
        const { page = 1, title = "", citys_id = 1 } = req.query;
        const where = { citys_id: citys_id };
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await VanuesModels.count({
                where: buildWhereClause(where, "title", title),
            })
        );

        const contentData = await VanuesModels.findAll({
            where: buildWhereClause(where, "title", title),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at", "citys_id"],
            },
        });

        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title,
        }));

        return responseApi(res, responseData, {
            assets_image_url: "https://google.com",
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: contentData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
export const createVanues = async (req, res) => {
    try {
        const { title, citys_id, provinces_id, countries_id } = req.body;
        await VanuesModels.create({
            title: title,
            citys_id: citys_id,
            provinces_id: provinces_id,
            countries_id: countries_id,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};
