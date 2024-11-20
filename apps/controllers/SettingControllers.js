import {
    createNameFile,
    getExtension,
    makeDataJwt,
    makeEpocTime,
    withTransaction,
} from "../../helpers/customHelpers.js";
import { signVisitorToken } from "../../libs/JwtHandlers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import CitysModels from "../models/CitysModels.js";
import UsersAccessAppsModels from "../models/UsersAccessAppsModels.js";
import UsersModels from "../models/UsersModels.js";
import { Sequelize, where } from "sequelize";
import VanuesModels from "../models/VanuesModels.js";
import { getPagination } from "../../helpers/paginationHelpers.js";
import { buildWhereClause } from "../../helpers/queryBuilderHelpers.js";
import db from "../../configs/Database.js";
import BaseNameAnonymousUsagesModels from "../models/BaseNameAnonymousUsagesModels.js";
import { uploadFile } from "../../helpers/FileUpload.js";
import { validateUniqueField } from "../../helpers/validationSavedData.js";
import bcrypt from "bcrypt";

const Op = Sequelize.Op;

export const visitorToken = async (req, res) => {
    try {
        const { datas, forwarded, agent } = makeDataJwt(req, 0);

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
        // res.cookie("access_token", visitorToken, {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: "Strict",
        //     maxAge: 60 * 60 * 1000,
        // });
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
        console.log("get visitor token", error);
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
            assets_image_url: process.env.APP_BUCKET_IMAGE,
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
            assets_image_url: process.env.APP_BUCKET_IMAGE,
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

/**
 * Create data Users / Registers
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const createUsers = withTransaction(async (req, res, transaction) => {
    try {
        const {
            fullname,
            description,
            email,
            phone,
            username,
            password,
            gender,
        } = req.body;
        const file = req.files && req.files.image;
        let filesNamed = "";
        if (file) {
            const fileDate = new Date();
            filesNamed = fileDate.getTime() + getExtension(file.name);
        }
        const { messageValidation, statusValidation } =
            await validateUniqueField(
                UsersModels,
                ["username", "phone", "email"],
                [username, phone, email]
            );
        if (statusValidation == 1) {
            return responseApi(res, [], null, messageValidation, 422);
        }
        const query = `SELECT 
        CONCAT(
            (SELECT name FROM ir_base_name_anonymous_users WHERE type = 1 ORDER BY RANDOM() LIMIT 1), 
            ' ', 
            (SELECT name FROM ir_base_name_anonymous_users WHERE type = 2 ORDER BY RANDOM() LIMIT 1), 
            ' ', 
            (SELECT name FROM ir_base_name_anonymous_users WHERE type = 3 ORDER BY RANDOM() LIMIT 1)
        ) AS name;`;
        const anonymousName = await db.query(query, {
            type: db.QueryTypes.SELECT,
        });
        const anonName = anonymousName[0].name.trim();
        const existingRecordName = await BaseNameAnonymousUsagesModels.findOne({
            where: {
                name: anonName,
            },
        });
        if (existingRecordName) {
            await BaseNameAnonymousUsagesModels.update(
                { total: existingRecordName.total + 1 },
                { where: { name: anonName } },
                { transaction }
            );
        } else {
            await BaseNameAnonymousUsagesModels.create(
                {
                    name: anonName,
                    total: 1,
                },
                { transaction }
            );
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await UsersModels.create(
            {
                display_name: fullname,
                display_name_anonymous: anonName,
                description: description,
                photo: filesNamed !== "" ? createNameFile(filesNamed) : "",
                email: email,
                phone: phone ?? null,
                username: username,
                password: hashedPassword,
                gender: gender,
                created_at: makeEpocTime(),
            },
            { transaction }
        );
        if (file) {
            const fileDestination =
                process.env.APP_LOCATION_FILE + createNameFile(filesNamed);
            await uploadFile(file, fileDestination);
        }
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.error("Error in create users:", error);
        throw error;
    }
});

export const loginUsers = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username) {
            return responseApi(
                res,
                [],
                null,
                "Username, phone, or email is required",
                1
            );
        }

        let user;
        if (/\S+@\S+\.\S+/.test(username)) {
            user = await UsersModels.findOne({ where: { email: username } });
        } else if (/^\d+$/.test(username)) {
            user = await UsersModels.findOne({ where: { phone: username } });
        } else {
            user = await UsersModels.findOne({ where: { username: username } });
        }

        if (!user) {
            return responseApi(res, [], null, "User not found", 1);
        }

        const trimmedPassword = password.trim();

        const isMatch = await bcrypt.compare(trimmedPassword, user.password);
        if (!isMatch) {
            return responseApi(res, [], null, "Invalid password", 1);
        }

        let visitorToken = "";
        if (user) {
            const { datas } = makeDataJwt(req, user.id);
            visitorToken = signVisitorToken({
                ...datas,
                anonymous: user.is_anonymous === 0 ? false : true,
                username: user.username,
                display_name: user.is_anonymous === 0 ? user.display_name : user.display_name_anonymous
            });
        }

        return responseApi(
            res,
            { access_token: visitorToken },
            null,
            "Login successful",
            0
        );
    } catch (error) {
        console.log("Error login users", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};
