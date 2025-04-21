import { Where } from "sequelize/lib/utils";
import db from "../../configs/Database.js";
import {
    getDataUserUsingToken,
    makeEpocTime,
} from "../../helpers/customHelpers.js";
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
        const getToken = await getDataUserUsingToken(req, res); // Menambahkan await di sini
        const groupSlugs = req.params.slug;
        const replacements = {
            groupSlugs: groupSlugs,
        };

        let whereClause =
            "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupSlugs";

        const query = `
            SELECT
                LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slugs,
                g.title,
                g.id
            FROM ir_groups g
            ${whereClause}
        `;

        const groupsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });

        if (!groupsData) {
            return responseApi(res, [], null, "Group not found", 1);
        }

        const groups_id = groupsData.id;
        const users_id = getToken.tod;

        const dataGroupMembers = await GroupMembersModels.findAll({
            where: {
                groups_id: groups_id,
                users_id: users_id,
            },
        });

        if (dataGroupMembers.length > 0) {
            if (dataGroupMembers[0].status === 3) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Sorry you have been blocked from the group",
                    2
                );
            }
        }

        const dataGroups = await GroupsModels.findAll({
            where: {
                id: groups_id,
                users_id: users_id,
            },
        });

        if (dataGroups.length > 0) {
            return responseApi(
                res,
                [],
                null,
                "Sorry you cannot join members",
                2
            );
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
                    WHEN g.users_id = ${getToken.tod} THEN 'joined' 
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 1 AND gm.users_id = ${getToken.tod}
                    ) THEN 'joined'
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 3 AND gm.users_id = ${getToken.tod}
                    ) THEN 'rejected'
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 2 AND gm.users_id = ${getToken.tod}
                    ) THEN 'waiting approval'
                    ELSE 'not joined'
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
                (
                    SELECT COUNT(*)
                    FROM (
                        SELECT DISTINCT gm.users_id
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 1

                        UNION ALL

                        SELECT DISTINCT g.users_id
                        FROM ir_groups g_inner
                        WHERE g_inner.id = g.id
                    ) AS all_members
                ) AS current_members,
                g.max_members as total_members,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', member.display_name,
                            'image', member.photo,
                            'role', member.role
                        )
                    )
                    FROM (
                        SELECT DISTINCT
                            u.display_name,
                            u.photo,
                            'member' AS role
                        FROM ir_group_members gm
                        JOIN ir_users u ON u.id = gm.users_id
                        WHERE gm.groups_id = g.id AND gm.status = 1

                        UNION ALL

                        SELECT DISTINCT
                            creator.display_name,
                            creator.photo,
                            'creator' AS role
                        FROM ir_users creator
                        WHERE creator.id = g.users_id
                    ) AS member
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
                slug: contentDetailSlugs,
            },
        });
        let responseData = {
            title: getContentDetail.title,
            list_groups: groupsData,
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
        let whereClause =
            "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupSlugs";
        replacements.groupSlugs = groupSlugs;
        const queryValidation = `
            SELECT
			gm.status
            FROM ir_groups g
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            ${whereClause}
            GROUP BY g.id, gm.id;
        `;
        const validationGroupsData = await db.query(queryValidation, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });
        if (typeof validationGroupsData?.status === "undefined") {
            return responseApi(
                res,
                {},
                {},
                "Data retrieved successfully undefined",
                1
            );
        } else {
            if (validationGroupsData?.status === 3) {
                return responseApi(
                    res,
                    {},
                    {},
                    "Data retrieved successfully 3",
                    1
                );
            }
        }

        const query = `
            SELECT
                LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slugs,
                g.title,
                TO_CHAR(TO_TIMESTAMP(g.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_group,
                cds.title AS event_title,
                cds.slug AS event_slug,
                CASE
                    WHEN g.users_id = ${getToken.tod} THEN 'joined' 
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 1 AND gm.users_id = ${getToken.tod}
                    ) THEN 'joined'
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 3 AND gm.users_id = ${getToken.tod}
                    ) THEN 'rejected'
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 2 AND gm.users_id = ${getToken.tod}
                    ) THEN 'waiting approval'
                    ELSE 'not joined'
                END AS is_joined,
                json_build_object(
                    'is_permitted_to_send', 
                        CASE 
                            WHEN ${getToken.tod} = 0 THEN false
                            WHEN u.gender  != g.is_gender THEN false
                            WHEN u.gender = g.is_gender AND ${getToken.tod} > 0  THEN true
                            ELSE true
                        END,
                    'message_title',
                        CASE 
                            WHEN ${getToken.tod} = 0 THEN 'Please log in to join'
                            WHEN u.gender != g.is_gender THEN  'Sorry, this group is ' ||  CASE  
                                WHEN g.is_gender = 1 THEN 'male'
                                WHEN g.is_gender = 2 THEN 'female'
                                ELSE 'unisex'
                                END || '-only.'
                            WHEN u.gender = g.is_gender AND ${getToken.tod} > 0  THEN 'This group is in anonymous mode.'
                            ELSE ''
                        END,
                    'message',
                        CASE 
                            WHEN ${getToken.tod} = 0 THEN 'Mohon maaf'
                            WHEN u.gender  != g.is_gender THEN 'It seems you dont meet the gender requirement for this group.'
                            WHEN u.gender = g.is_gender AND ${getToken.tod} > 0 THEN 'You will use an anonymous nickname and your profile will be hidden in this group.'
                            ELSE ''
                        END
                ) AS group_join_status,
                g.description,
                json_build_object(
                    'is_gender', 
                    CASE 
                        WHEN g.is_gender = 1 THEN 'male'
                        WHEN g.is_gender = 2 THEN 'female'
                        ELSE 'unisex'
                    END,
                    'is_private', 
                    CASE 
                        WHEN g.is_private = 0 THEN false
                        ELSE true
                    END,
                    'is_anonymous_mode', 
                    CASE 
                        WHEN g.is_anonymous = 0 THEN false
                        ELSE true
                    END
                ) AS policies,
                json_build_object(
                    'name', u.display_name,
                    'image', u.photo,
                    'username', u.username
                ) AS user,
                json_build_object(
                    'city', json_build_object(
                        'id', c.id,
                        'name', c.title
                    )
                ) AS location,
                (
                    SELECT COUNT(*)
                    FROM (
                        SELECT DISTINCT gm.users_id
                        FROM ir_group_members gm
                        WHERE gm.groups_id = g.id AND gm.status = 1

                        UNION ALL

                        SELECT DISTINCT g.users_id
                        FROM ir_groups g_inner
                        WHERE g_inner.id = g.id
                    ) AS all_members
                ) AS current_members,
                g.max_members AS total_members,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', member.display_name,
                            'image', member.photo,
                            'role', member.role
                        )
                    )
                    FROM (
                        SELECT DISTINCT
                            u.display_name,
                            u.photo,
                            'member' AS role
                        FROM ir_group_members gm
                        JOIN ir_users u ON u.id = gm.users_id
                        WHERE gm.groups_id = g.id AND gm.status = 1

                        UNION ALL

                        SELECT DISTINCT
                            creator.display_name,
                            creator.photo,
                            'creator' AS role
                        FROM ir_users creator
                        WHERE creator.id = g.users_id
                    ) AS member
                ) AS members,
                CASE
                    WHEN g.users_id = ${getToken.tod} THEN (
                        SELECT json_agg(
                            json_build_object(
                                'name', u.display_name,
                                'image', u.photo,
                                'username', u.username,
                                'joined_date', TO_CHAR(TO_TIMESTAMP(gm.created_at), 'YYYY-MM-DD HH24:MI:SS')
                            )
                        )
                        FROM ir_group_members gm
                        JOIN ir_users u ON u.id = gm.users_id
                        WHERE gm.groups_id = g.id AND gm.status = 2
                    )
                    ELSE NULL
                END AS members_need_approval
            FROM ir_groups g
            LEFT JOIN ir_users u ON u.id = g.users_id
            LEFT JOIN ir_citys c ON c.id = g.citys_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            LEFT JOIN ir_content_details cds ON g.content_details_id = cds.id
            ${whereClause}
            GROUP BY g.id, u.id, c.id, cds.id;
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

export const approveMember = async (req, res) => {
    try {
        const { username } = req.body;
        const getToken = getDataUserUsingToken(req, res);

        const groupSlugs = req.params.slug;
        const replacements = {};
        let whereClause = `WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupSlugs 
            AND g.users_id = :userToken AND u.username = :username`;
        replacements.groupSlugs = groupSlugs;
        replacements.userToken = getToken.tod;
        replacements.username = username;
        const queryValidation = `
            SELECT
			gm.status,
            gm.id
            FROM ir_groups g
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            LEFT JOIN ir_users u ON u.id = gm.users_id
            ${whereClause}
            GROUP BY g.id, gm.id, u.id;
        `;
        const validationGroupsData = await db.query(queryValidation, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });
        if (typeof validationGroupsData?.status === "undefined") {
            return responseApi(
                res,
                {},
                {},
                "Data retrieved successfully undefined",
                1
            );
        } else {
            if (validationGroupsData?.status === 3) {
                return responseApi(
                    res,
                    {},
                    {},
                    "Data retrieved successfully 3",
                    1
                );
            }
        }
        await GroupMembersModels.update(
            {
                status: 1,
            },
            {
                where: {
                    id: validationGroupsData?.id,
                },
            }
        );

        return responseApi(
            res,
            [],
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
