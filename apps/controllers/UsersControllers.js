import { responseApi } from "../../libs/RestApiHandler.js";
import { Sequelize } from "sequelize";
import UsersModels from "../models/UsersModels.js";
import {
    dateToEpochTime,
    getDataUserUsingToken,
    makeDataJwt,
} from "../../helpers/customHelpers.js";
import FollowingUsersModels from "../models/FollowingUsersModels.js";
import db from "../../configs/Database.js";
import { signVisitorToken } from "../../libs/JwtHandlers.js";

const Op = Sequelize.Op;
export const getDetailUser = async (req, res) => {
    const getToken = await getDataUserUsingToken(req, res);
    try {
        const usernameUser = req.params.username;
        const replacements = { usernameUser };
        const userData = await UsersModels.findOne({
            where: { username: usernameUser },
        });

        if (!userData) {
            return responseApi(res, [], null, "User not found", 1);
        }

        const isOwner = Number(userData.id) === Number(getToken.tod);
        const queryFollowedUser = `
            (
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_following_users ifs
                        WHERE 
                        ${isOwner ?
                            `ifs.users_id = ${getToken.tod}` : `ifs.users_id = u.id`
                        }
                    ) THEN true
                    ELSE false
                END
            ) AS followed_user,
            (
                SELECT COUNT(*)
                FROM ir_following_users f
                WHERE 
                ${isOwner ?
                `f.users_id = ${getToken.tod}` : `f.users_id = u.id`
            }
                
            ) AS total_followers,`;

        const query = `
            SELECT
                u.username,
                u.display_name,
                u.email,
                u.description,
                u.photo,
                u.phone,
                (
                    CASE 
                        WHEN u.gender = 1 THEN 'male'
                        WHEN u.gender = 2 THEN 'female'
                        ELSE 'unisex'
                    END
                ) as gender,
                (
                    CASE 
                        WHEN u.is_anonymous = 0 THEN 'non active'
                        WHEN u.is_anonymous = 1 THEN 'active'
                        ELSE 'unisex'
                    END
                ) as anonymous,
                ${queryFollowedUser}
                (
                    SELECT COUNT(*)
                    FROM ir_content_detail_followers cdf
                    WHERE cdf.users_id = u.id
                ) AS total_event_followed,
                (
                    SELECT COUNT(*)
                    FROM ir_post_content_details pcds
                    WHERE pcds.users_id = u.id
                ) AS total_post
            FROM ir_users u
            WHERE username = :usernameUser
            GROUP BY u.id;
        `;

        const queryUser = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });

        const response = {
            email: queryUser.email,
            phone: queryUser.phone,
            gender: queryUser.gender,
            anonymous: queryUser.anonymous,
            display_name: queryUser.display_name,
            username: queryUser.username,
            description: queryUser.description,
            image: process.env.APP_BUCKET_IMAGE + queryUser.photo,
            followers: queryUser.followers || [],
            total_followers: queryUser.total_followers || 0,
            followed_user: !isOwner ? queryUser.followed_user : false,
            total_post: queryUser.total_post,
            total_event_followed: queryUser.total_event_followed,
        };

        return responseApi(res, response, null, "Data has been retrieved", 0);
    } catch (error) {
        console.error("Error:", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

export const followUser = async (req, res) => {
    try {
        const dataTokenUser = getDataUserUsingToken(req, res);
        const usernameUser = req.params.username;
        const getDataUsersModels = await UsersModels.findOne({
            where: {
                username: usernameUser,
            },
        });
        const follow = await FollowingUsersModels.findOne({
            where: {
                users_id: Number(getDataUsersModels.id),
                following_id: Number(dataTokenUser.tod),
            },
        });
        if (follow) {
            await follow.destroy();
        } else {
            await FollowingUsersModels.create({
                users_id: Number(getDataUsersModels.id),
                following_id: Number(dataTokenUser.tod),
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            });
        }
        return responseApi(
            res,
            [],
            null,
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const updateDataUser = async (req, res) => {
    try {
        const {
            display_name,
            description,
            email,
            photo,
            username,
            gender,
            anonymous,
            phone,
        } = req.body;

        const getToken = await getDataUserUsingToken(req, res);
        const userFind = await UsersModels.findOne({
            where: { id: getToken.tod },
        });

        if (!userFind) {
            return responseApi(res, [], null, "Sorry data not found", 1);
        }
        if (
            !email ||
            email.trim() === "" ||
            !username ||
            username.trim() === ""
        ) {
            return responseApi(
                res,
                [],
                null,
                "Email and Username cannot be null, empty, or just spaces",
                1
            );
        }
        const emailExist = await UsersModels.findOne({
            where: {
                email: email,
                id: { [Op.ne]: getToken.tod },
            },
        });
        if (emailExist) {
            return responseApi(res, [], null, "Email is already in use", 1);
        }

        const usernameExist = await UsersModels.findOne({
            where: {
                username: username,
                id: { [Op.ne]: getToken.tod },
            },
        });
        if (usernameExist) {
            return responseApi(res, [], null, "Username is already in use", 1);
        }

        if (phone) {
            const phoneExist = await UsersModels.findOne({
                where: {
                    phone: phone,
                    id: { [Op.ne]: getToken.tod }, // Tidak memeriksa pengguna yang sama
                },
            });
            if (phoneExist) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Phone number is already in use",
                    1
                );
            }
        }

        await UsersModels.update(
            {
                display_name: display_name,
                description: description,
                email: email,
                photo: photo,
                username: username,
                gender: gender,
                is_anonymous: anonymous,
                phone: phone,
            },
            {
                where: {
                    id: getToken.tod,
                },
            }
        );
        let visitorToken = "";
        if (userFind) {
            const userUpdated = await UsersModels.findOne({
                where: { id: getToken.tod },
            });
            const { datas } = makeDataJwt(req, Number(userUpdated.id));
            visitorToken = signVisitorToken({
                ...datas,
                username: userUpdated.username,
                display_name: userUpdated.display_name,
                display_name_anonymous: userUpdated.display_name_anonymous,
                image: userUpdated.photo,
            });
        }

        return responseApi(
            res,
            {
                access_token: visitorToken,
            },
            null,
            "Data has been updated",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const checkExistingDataUser = async (req, res) => {
    try {
        const dataTokenUser = getDataUserUsingToken(req, res);

        const type = req.params.type;
        const { check_string } = req.body;

        let queryResult;

        if (type === "phone") {
            queryResult = await UsersModels.findOne({
                where: {
                    phone: check_string,
                },
            });
        } else if (type === "email") {
            queryResult = await UsersModels.findOne({
                where: {
                    email: check_string,
                },
            });
        } else if (type === "username") {
            queryResult = await UsersModels.findOne({
                where: {
                    username: check_string,
                },
            });
        } else {
            return responseApi(res, [], null, "Server error ......!", 1);
        }
        if (queryResult) {
            return Number(queryResult?.id) !== Number(dataTokenUser.tod)
                ? responseApi(
                    res,
                    [check_string],
                    null,
                    `${check_string} is already taken`,
                    0
                )
                : responseApi(
                    res,
                    [check_string],
                    null,
                    `${check_string} is your data`,
                    0
                );
        }

        // Jika data tidak ditemukan
        return responseApi(
            res,
            [check_string],
            null,
            "You can use this option",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
