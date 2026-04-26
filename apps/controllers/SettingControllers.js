import {
    createNameFile,
    dateToEpochTime,
    downloadImage,
    formatString,
    getDataUserUsingToken,
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
import { uploadImageFromUrl, uploadFileToStorage } from "../../helpers/StorageUpload.js";
import { validateUniqueField } from "../../helpers/validationSavedData.js";
import bcrypt from "bcryptjs";
import { validationRegisterUsers } from "../validators/usersValidators.js";
import axios from "axios";
import { encrypt } from "../../helpers/CustomShortEncrypt.js";
import AboutModels from "../models/AboutModels.js";
import NotificationModels from "../models/NotificationModels.js";

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
                    created_at: !req.headers["x-date-for"] ? makeEpocTime() : dateToEpochTime(req.headers["x-date-for"]),
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
            email,
            username,
            gender,
            image,
            date_of_birth
        } = req.body;
        const file = req.files && req.files.image;
        let putPhotoOnTable = "";
        if (file) {
            // Multipart file upload → Supabase Storage
            putPhotoOnTable = await uploadFileToStorage(file.data, file.name, file.mimetype);
        } else if (image) {
            // URL (e.g. Google profile pic) → download & upload to Supabase Storage
            putPhotoOnTable = await uploadImageFromUrl(image);
        }
        const password = email;

        const validationResult = validationRegisterUsers({
            fullname,
            email,
            username,
            gender,
            date_of_birth
        });

        if (!validationResult.valid) {
            return responseApi(
                res,
                validationResult.errors,
                null,
                "sorry any something wrong ...!",
                422
            );
        }

        const { messageValidation, statusValidation, labelValidation } =
            await validateUniqueField(
                UsersModels,
                ["username", "email"],
                [username, email]
            );
        if (statusValidation == 1) {
            return responseApi(
                res,
                {
                    message: messageValidation,
                    label: labelValidation
                },
                null,
                messageValidation,
                422
            );
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
        const newUser = await UsersModels.create(
            {
                display_name: fullname,
                display_name_anonymous: anonName,
                photo: putPhotoOnTable,
                email: email,
                phone: null,
                username: username,
                username_anonymous: await encrypt(formatString(anonName), "rahasia123"),
                password: hashedPassword,
                gender: gender,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
                date_of_birth: dateToEpochTime(date_of_birth)
            },
            { transaction }
        );
        let visitorToken = "";
        if (newUser) {
            const { datas } = makeDataJwt(req, newUser.id);
            visitorToken = signVisitorToken({
                ...datas,
                username: newUser.username,
                display_name: newUser.display_name,
                display_name_anonymous: newUser.display_name_anonymous,
                username_anonymous: newUser.username_anonymous,
                gender: newUser.gender,
                image: newUser.photo,
                expired_verified: newUser.expired_verified,
                is_verified: newUser.is_verified === 1 ? true : false,
            });
        }

        return responseApi(
            res,
            { access_token: visitorToken },
            null,
            "Data Success Saved",
            0
        );
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
                "Username is required",
                1
            );
        }

        let user;
        if (/\S+@\S+\.\S+/.test(username)) {
            user = await UsersModels.findOne({ where: { email: username, deleted_at: null } });
        } else if (/^\d+$/.test(username)) {
            user = await UsersModels.findOne({ where: { phone: username, deleted_at: null } });
        } else {
            user = await UsersModels.findOne({ where: { username: username, deleted_at: null } });
        }

        if (!user) {
            return responseApi(res, [], user, "User not found", 1);
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
                username: user.username,
                display_name: user.display_name,
                display_name_anonymous: user.display_name_anonymous,
                username_anonymous: user.username_anonymous,
                gender: user.gender,
                image: user.photo,
                expired_verified: user.expired_verified,
                is_verified: user.is_verified === 1 ? true : false,
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


export const checkAuth = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(401).json({ message: "Token is required" });
        }


        const userResponse = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        const userDetails = userResponse.data;

        const getExistingUser = await UsersModels.findOne({
            where: {
                email: userDetails.email,
            },
        });
        if (getExistingUser) {
            if (getExistingUser.deleted_at !== null) {
                return responseApi(res, {}, null, "Sorry your account is deactivated", 418);
            }
        }
        let visitorToken = "";
        let dataToken = {};
        if (getExistingUser) {
            const { datas } = makeDataJwt(req, getExistingUser.id);
            visitorToken = signVisitorToken({
                ...datas,
                username: getExistingUser.username,
                display_name: getExistingUser.display_name,
                display_name_anonymous: getExistingUser.display_name_anonymous,
                username_anonymous: getExistingUser.username_anonymous,
                gender: getExistingUser.gender,
                image: getExistingUser.photo,
                expired_verified: getExistingUser.expired_verified,
                is_verified: getExistingUser.is_verified === 1 ? true : false,
            });
            dataToken = { access_token: visitorToken };
        }
        const textResponse =
            visitorToken !== ""
                ? "Data has been retrieved"
                : "Please continue to complete the registration process. Thank you!";
        return responseApi(
            res,
            visitorToken !== "" ? dataToken : userDetails,
            null,
            textResponse,
            0
        );
    } catch (error) {
        console.error("Error verifying token:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const createAbout = withTransaction(async (req, res) => {
    try {
        const {
            description,
            type
        } = req.body;
        await AboutModels.create({
            created_at: !req.headers["x-date-for"] ? makeEpocTime() : dateToEpochTime(req.headers["x-date-for"]),
            description,
            type
        })
        return responseApi(
            res,
            [],
            null,
            null,
            0
        );
    } catch (error) {
        console.error("[Error] create about:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
})
export const getAbout = async (req, res) => {
    try {
        const {
            type
        } = req.query;
        const data = await AboutModels.findOne({
            attributes: ["type", "description"],
            where: {
                type: type
            },
        })
        return responseApi(
            res,
            data,
            null,
            null,
            0
        );
    } catch (error) {
        console.error("[Error] get about:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}

export const getAnyNotif = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const userId = getToken.tod;
        const data = await NotificationModels.findOne({
            attributes: ["id"],
            where: {
                // users_id: 2,
                users_id: userId,
                is_read: 0
            },
        })
        return responseApi(
            res,
            { any: data?.id ? true : false },
            null,
            null,
            0
        );
    } catch (error) {
        console.error("[Error] get any notif:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}


export const getNotification = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const userId = getToken.tod;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;

        const replacements = {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };
        replacements.users_id = userId;
        // replacements.users_id = 2;
        const query = `
            -- Notifikasi type = 4 (follow_notifications)
            SELECT
                ins.id AS notification_id,
                ius.username,
                ius.photo AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/profile/' || ius.username AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_following_users ifus ON ifus.id = ins.source_id
            JOIN ir_users ius ON ius.id = ifus.following_id
            WHERE ins.users_id = :users_id
            AND ins.type = 4
            -- END Notifikasi type = 4 (follow_notifications)
            UNION ALL
            -- Notifikasi type = 6 (like_posts_notification)
            SELECT
                ins.id AS notification_id,
                usl.username,
                usl.photo AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/post/' || ipcd.slug AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_like_post_content_details ilcd ON ilcd.id = ins.source_id
						JOIN ir_post_content_details ipcd ON ipcd.id = ilcd.post_content_details_id
						JOIN ir_users usl ON usl.id = ilcd.users_id
            WHERE ins.users_id = :users_id
            AND ins.type = 7
			-- END Notifikasi type = 2 (like_posts_notification)
            UNION ALL
            -- Notifikasi type = 6 (like_posts_notification)
            SELECT
                ins.id AS notification_id,
                usl.username,
                usl.photo AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/post/' || ipcd.slug AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_like_post_content_details ilcd ON ilcd.id = ins.source_id
						JOIN ir_post_content_details ipcd ON ipcd.id = ilcd.post_content_details_id
						JOIN ir_users usl ON usl.id = ilcd.users_id
            WHERE ins.users_id = :users_id
            AND ins.type = 6
			-- END Notifikasi type = 6 (like_posts_notification)
            UNION ALL
            -- Notifikasi type = 2 (like_moment_notification)
            SELECT
                ins.id AS notification_id,
                usl.username,
                usl.photo AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/m/' || ipcd.slug AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_like_post_content_details ilcd ON ilcd.id = ins.source_id
            JOIN ir_post_content_details ipcd ON ipcd.id = ilcd.post_content_details_id
            JOIN ir_users usl ON usl.id = ilcd.users_id
            WHERE ins.users_id = :users_id
            AND ins.type = 2
			-- END Notifikasi type = 2 (like_moment_notification)
            UNION ALL
            -- Notifikasi type = 3 (comment_moment_notification)
            SELECT
                ins.id AS notification_id,
                usl.username,
                usl.photo AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/m/' || ipcd.slug AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_comment_post_content_details icpcd ON icpcd.id = ins.source_id
            JOIN ir_post_content_details ipcd ON ipcd.id = icpcd.post_content_details_id
            JOIN ir_users usl ON usl.id = icpcd.users_id
            WHERE ins.users_id = :users_id
            AND ins.type = 3
			-- END Notifikasi type = 2 (comment_moment_notification)
            UNION ALL
            -- Notifikasi type = 5 and type = 1 and type = 8 (join_groups_private_notification and join_groups_notification)
            SELECT
                ins.id AS notification_id,
                usl.username,
                usl.photo AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/event/' || icds.slug || '/group/' || igs.slug  AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_group_members igms ON igms.id = ins.source_id
            JOIN ir_groups igs ON igs.id = igms.groups_id
            JOIN ir_content_details icds ON icds.id = igs.content_details_id
            JOIN ir_users usl ON usl.id = igms.users_id
            WHERE ins.users_id = :users_id
            AND (ins.type = 5 OR ins.type = 1 OR ins.type = 8)
             -- Notifikasi type = 8
            UNION ALL
            SELECT
                ins.id AS notification_id,
                NULL AS username,
                NULL AS image,
                TO_CHAR(TO_TIMESTAMP(ins.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created,
                '/event/' || icds.slug || '/group/' || igs.slug  AS link,
                ins.message,
                ins.is_read
            FROM ir_notifications ins
            JOIN ir_groups igs ON igs.id = ins.source_id
            JOIN ir_content_details icds ON icds.id = igs.content_details_id
            JOIN ir_users usl ON usl.id = ins.users_id
            WHERE ins.users_id = :users_id
            AND ins.type = 8
			-- END Notifikasi type = 8 (End new messages)
            ORDER BY notification_id DESC
            LIMIT :limit OFFSET :offset;
            `;
        const executeQuery = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_notifications ins
            WHERE ins.users_id = :users_id;
        `;

        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = parseInt(totalCountResult[0]?.total_count || 0, 10);
        const totalPages = Math.ceil(totalCount / limit);
        await NotificationModels.update(
            {
                is_read: 1,
            },
            {
                where: {
                    users_id: userId,
                    is_read: 0
                },
            }
        );

        return responseApi(
            res,
            executeQuery,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.error("[Error] get any notif:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}

export const updateStatusNotification = async (req, res) => {
    try {
        const notif_id = req.params.id;
        // await NotificationModels.update(
        //     {
        //         is_read: 1,
        //     },
        //     {
        //         where: {
        //             id: notif_id,
        //         },
        //     }
        // );
        return responseApi(
            res,
            {},
            null,
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.error("[Error] get any notif:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}

export const deactiveAccount = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const userId = getToken.tod;
        const usernameEncoding = req.params.usernameEncoding;
        const acceptedProcessed = ['http://localhost:3000/', 'https://deursocial.com/', 'https://www.deursocial.com/']
        const nextProcessed = acceptedProcessed.includes(req.headers.referer)
        const parseEncoding = atob(usernameEncoding).split('-')
        if (Number(userId) !== Number(parseEncoding[1])) {
            return responseApi(res, {}, null, "Haa?", 418);
        }
        if (!nextProcessed) {
            return responseApi(res, {}, null, "Ha?", 418);
        }
        const userFind = await UsersModels.findOne({
            where: { id: userId },
        });

        if (!userFind) {
            return responseApi(res, [], null, "Sorry data not found", 418);
        }
        let objUpdate = {
            deleted_at: dateToEpochTime(req.headers["x-date-for"])
        }
        await UsersModels.update(objUpdate,
            {
                where: {
                    id: getToken.tod,
                },
            }
        );
        return responseApi(
            res,
            {},
            null,
            "Success Deactive",
            0
        );
    } catch (error) {
        console.error("[Error] deactive account:", error);
        return responseApi(res, [], null, "Server error....", 418);
    }
}