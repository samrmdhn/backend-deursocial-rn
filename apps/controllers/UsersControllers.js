import { responseApi } from "../../libs/RestApiHandler.js";
import { Sequelize } from "sequelize";
import UsersModels from "../models/UsersModels.js";
import {
    dateToEpochTime,
    getDataUserUsingToken,
} from "../../helpers/customHelpers.js";
import FollowerUsersModels from "../models/FollowerUsersModels.js";
import db from "../../configs/Database.js";

const Op = Sequelize.Op;
export const getDetailUser = async (req, res) => {
    try {
        const usernameUser = req.params.username;
        const replacements = {
            usernameUser: usernameUser,
        };
        const query = `
            SELECT
                u.username,
                u.display_name,
                u.display_name,
                u.description,
                u.photo,
                (
                    SELECT COUNT(*)
                    FROM ir_follower_users f
                    WHERE f.following_id = u.id
                ) AS total_followers,
                (
                    CASE 
                        WHEN EXISTS (
                            SELECT 1
                            FROM ir_follower_users ifs
                            WHERE ifs.following_id = u.id
                        ) THEN true
                        ELSE false
                    END
                ) AS followed_user,
                (
                    SELECT json_agg(
                        json_build_object(
                            'username', u_f.username
                        )
                    )
                    FROM ir_follower_users f
                    INNER JOIN ir_users u_f ON u_f.id = f.follower_id
                    WHERE f.following_id = u.id
                    LIMIT 5
                ) AS followers
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
            display_name: queryUser.display_name,
            username: queryUser.username,
            description: queryUser.description,
            image: process.env.APP_BUCKET_IMAGE + queryUser.photo,
            followers: queryUser.followers,
            total_followers: queryUser.total_followers,
            followed_user: queryUser.followed_user,
        };
        return responseApi(res, response, null, "Data has been retrieved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
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
        const follow = await FollowerUsersModels.findOne({
            where: {
                follower_id: Number(dataTokenUser.tod),
                following_id: Number(getDataUsersModels.id),
            },
        });

        if (follow) {
            // Jika user ditemukan, hapus user tersebut
            await follow.destroy();
        } else {
            await FollowerUsersModels.create({
                follower_id: Number(dataTokenUser.tod),
                following_id: Number(getDataUsersModels.id),
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            });
        }
        return responseApi(
            res,
            ["response"],
            null,
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
