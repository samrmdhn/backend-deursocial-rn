import db from "../../configs/Database.js";
import { makeEpocTime } from "../../helpers/customHelpers.js";
import { getPagination } from "../../helpers/paginationHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import GroupMembersModels from "../models/GroupMembersModels.js";
import GroupsModels from "../models/GroupsModels.js";
import UsersModels from "../models/UsersModels.js";

export const createGroups = async (req, res) => {
    try {
        const {
            title,
            users_id,
            description,
            citys_id,
            content_details_id,
            max_members,
            is_gender,
            is_anonymous,
            is_private,
        } = req.body;
        await GroupsModels.create({
            title: title,
            users_id: users_id,
            description: description,
            citys_id: citys_id,
            content_details_id: content_details_id,
            max_members: max_members,
            is_gender: is_gender,
            is_private: is_private,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const joinMemberToGroups = async (req, res) => {
    try {
        const { groups_id, users_id } = req.body;
        const dataGroupMembers = await GroupMembersModels.findAll({
            where: {
                groups_id: groups_id,
                users_id: users_id,
            },
        });
        if (dataGroupMembers.length > 0) {
            if (dataGroupMembers[0].status === 3) {
                return responseApi(res, [], null, "Sorry you cannot joined members", 2);
            }
        }
        const dataGroups = await GroupsModels.findAll({
            where: {
                id: groups_id,
                users_id: users_id
            }
        });
        if (dataGroups.length > 0) {
            return responseApi(res, [], null, "Sorry you cannot joined members", 2);
        }

        await GroupMembersModels.create({
            users_id: users_id,
            groups_id: groups_id,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const getGroups = async (req, res) => {
    try {
        const { page = 1, title = "", slug = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = ` WHERE g.status = 1`;
        const replacements = {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };


        const query = `
            SELECT
                g.id AS groups_id,
                g.title,
                g.description,
                json_build_object(
                    'is_gender', 
                    CASE 
                        WHEN g.is_gender = 1 THEN 'men'
                        WHEN g.is_gender = 2 THEN 'women'
                        ELSE 'unisex'
                    END,
                    'is_private', CASE 
                        WHEN g.is_private = 0 THEN false
                        ELSE true
                    END,

                    'is_anonymous_mode', CASE 
                        WHEN g.is_anonymous = 0 THEN false
                        ELSE true
                    END
                ) AS detail,
                    json_build_object(
                        'name', u.display_name,
                        'image', u.photo
                    )AS users,
                c.title AS citys,
                COUNT(gm.users_id) AS current_members,
                    g.max_members as total_members,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', u.display_name,
                            'image', u.photo
                        )
                    )
                    FROM ir_group_members gm
                    JOIN ir_users u ON u.id = gm.users_id
                    WHERE gm.groups_id = g.id AND gm.status = 1
                ) AS members
            FROM ir_groups g
            LEFT JOIN ir_users u ON u.id = g.users_id
            LEFT JOIN ir_citys c ON c.id = g.citys_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            GROUP BY g.id, u.id, c.id
            LIMIT :limit OFFSET :offset;
        `;

        const groupsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        // Query untuk menghitung total data
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_groups g
            ${whereClause};
        `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);

        let responseData = groupsData;
        return responseApi(
            res,
            responseData,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: parseInt(limit, 10),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data retrieved successfully",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
