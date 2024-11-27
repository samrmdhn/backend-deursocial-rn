import db from "../../configs/Database.js";
import { getDataUserUsingToken, makeEpocTime } from "../../helpers/customHelpers.js";
import { getPagination } from "../../helpers/paginationHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import GroupMembersModels from "../models/GroupMembersModels.js";
import GroupsModels from "../models/GroupsModels.js";

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
        const slug = req.params.slug;

        const getContentDetail = await ContentDetailsModels.findOne({
            where: { slug: slug },
        });
        if (!getContentDetail) {
            return responseApi(
                res,
                [],
                null,
                "Sorry you cannot be create groups",
                2
            );
        }
        const contentDetailsId = getContentDetail.id;
        await GroupsModels.create({
            title: title,
            users_id: users_id,
            description: description,
            citys_id: citys_id,
            content_details_id: contentDetailsId,
            max_members: max_members,
            is_gender: is_gender,
            is_private: is_private,
            is_anonymous: is_anonymous,
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
        const getToken = getDataUserUsingToken(req, res);

        const { groups_id } = req.body;
        let users_id = getToken.tod;
        const dataGroupMembers = await GroupMembersModels.findAll({
            where: {
                groups_id: groups_id,
                users_id: users_id,
            },
        });
        if (dataGroupMembers.length > 0) {
            if (dataGroupMembers[0].status === 3) {
                return responseApi(res, [], null, "Sorry you have been blocked from the group", 2);
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
        const getToken = getDataUserUsingToken(req, res);
        const contentDetailSlugs = req.params.contentDetailSlugs;
        const { page = 1, title = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = `WHERE cds.slug = :contentDetailSlugs`;
        const replacements = {
            contentDetailSlugs: contentDetailSlugs,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        if (title) {
            whereClause += ` AND g.title ILIKE :title`;
            replacements.title = `%${title}%`;
        }

        const query = `
            SELECT
                g.id AS id,
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 1 AND gm.users_id = ${getToken.tod}
                    ) THEN true
                    ELSE false 
                END AS is_joined,
                LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug,
                g.title,
                g.description,
                json_build_object(
                    'is_gender', 
                    CASE 
                        WHEN g.is_gender = 1 THEN 'male'
                        WHEN g.is_gender = 2 THEN 'female'
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
                ) AS policies,
                    json_build_object(
                        'name', u.display_name,
                        'image', u.photo,
                        'username', u.username
                    )AS user,
                json_build_object(
                    'city', json_build_object(
                        'id', c.id,
                        'name', c.title
                    )
                ) AS location,
                CAST(COUNT(gm.users_id) AS INTEGER) AS current_members,
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
            LEFT JOIN ir_content_details cds ON cds.id = g.content_details_id
            LEFT JOIN ir_users u ON u.id = g.users_id
            LEFT JOIN ir_citys c ON c.id = g.citys_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            ${whereClause}
            GROUP BY g.id, u.id, c.id, cds.id
            LIMIT :limit OFFSET :offset;
        `;

        const groupsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_groups g
            LEFT JOIN ir_content_details cds ON cds.id = g.content_details_id
            ${whereClause};
        `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);
        const getContentDetail = await ContentDetailsModels.findOne({
            where: {
                slug: contentDetailSlugs
            }
        })
        let responseData = {
            title: getContentDetail.title,
            list_groups: groupsData
        };
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

export const getGroupsDetail = async (req, res) => {
    const getToken = getDataUserUsingToken(req, res);
    try {
        const groupSlugs = req.params.slugs;
        const replacements = {};
        let whereClause = "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupSlugs";
        replacements.groupSlugs = groupSlugs;
        const query = `
            SELECT
                LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slugs,
                g.title,
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 1 AND gm.users_id = ${getToken.tod}
                    ) THEN true
                    ELSE false 
                END AS is_joined,
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
                ) AS policies,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'username', u.username
                )AS user,
                json_build_object(
                    'city', json_build_object(
                        'id', c.id,
                        'name', c.title
                    )
                ) AS location,
                CAST(COUNT(gm.users_id) AS INTEGER) AS current_members,
                CAST(COUNT(gm.users_id) AS INTEGER) AS current_members,
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
            ${whereClause}
            GROUP BY g.id, u.id, c.id;
        `;

        const groupsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        

        let responseData = {};
        if (groupsData.length > 0) {
            responseData = groupsData[0];
        }
        return responseApi(
            res,
            responseData,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
            },
            "Data retrieved successfully",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};