import { Where } from "sequelize/lib/utils";
import db from "../../configs/Database.js";
import {
    convertToSlug,
    dateToEpochTime,
    getDataUsersUsingReqAndRes,
    getDataUserUsingToken,
    makeEpocTime,
    makeRandomString,
    withTransaction,
} from "../../helpers/customHelpers.js";
import { getPagination } from "../../helpers/paginationHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import GroupMembersModels from "../models/GroupMembersModels.js";
import GroupsModels from "../models/GroupsModels.js";
import UsersModels from "../models/UsersModels.js";
import ChatGroupsModels from "../models/ChatGroupsModels.js";
import ChatStatusGroupsModels from "../models/ChatStatusGroupsModels.js";
import { generateNotificationMessage } from "../../helpers/notification.js";

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
        if (is_anonymous) {
            const dataUser = await getDataUsersUsingReqAndRes(req, res);
            if (dataUser.status) {
                if (dataUser.data.is_anonymous === 0) {
                    return responseApi(
                        res,
                        [],
                        null,
                        "Sorry you cannot be create groups, change to anonymous mode!",
                        1
                    );
                }
            }
        }
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
        const newGroup = await GroupsModels.create({
            title: title,
            slug: convertToSlug(title.substring(0, 35)) + "_" + makeRandomString(3),
            users_id: users_id,
            description: description,
            citys_id: citys_id,
            content_details_id: contentDetailsId,
            max_members: max_members,
            is_gender: is_gender,
            is_private: is_private,
            is_anonymous: is_anonymous,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        });
        return responseApi(res, { slug: newGroup.slug }, null, "Data Success Saved", 0);
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
        let statusMember = 1;

        let whereClause =
            "WHERE g.slug = :groupSlugs";

        const query = `
            SELECT
                g.slug AS slugs,
                g.title,
                g.id,
                g.users_id,
                g.is_gender,
                g.max_members,
                g.is_anonymous,
                g.is_private,
                g.status,
                g.password_join
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

        const queryUser = `
            SELECT 
            u.id,
            u.gender
            FROM ir_users u WHERE u.id = ${users_id}
        `;

        const dataUser = await db.query(queryUser, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });
        if (groupsData.is_gender > 0) {
            if (dataUser.gender != groupsData.is_gender) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Sorry you join the group, this group is " + (groupsData.is_gender === 1 ? "male" : "female") + " only",
                    2
                );
            }
        }
        if (groupsData.is_anonymous > 0) {
            if (dataUser.is_anonymous == 0) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Sorry you join the group, this group is anonymous only",
                    2
                );
            }
        }


        const dataGroupMember = await GroupMembersModels.findOne({
            where: {
                groups_id: groups_id,
                users_id: users_id,
            },
        });

        if (dataGroupMember) {
            if (dataGroupMember.status === 3) {
                return responseApi(
                    res,
                    [],
                    null,
                    "Sorry you have been blocked from the group",
                    2
                );
            }
        }

        const dataGroupsMembers = await GroupMembersModels.findAll({
            where: {
                groups_id: groups_id,
                status: 1,
            },
        });
        // +1 for the creator who is not in the members table
        if ((dataGroupsMembers.length + 1 + 1) > groupsData.max_members) {
            return responseApi(
                res,
                [],
                null,
                "Sorry you cannot join members, the group is fully max member",
                2
            );
        }
        if (groupsData.is_private === 1) {
            statusMember = 2;
        }

        if (dataGroupMember) {
            if (dataGroupMember.status === 2) {
                await dataGroupMember.destroy()
                return responseApi(res, [], null, "You have successfully left the group.", 0);
            }
            if (dataGroupMember.status === 4) {
                dataGroupMember.update(
                    {
                        status: statusMember,
                    },
                    {
                        where: {
                            groups_id: groups_id,
                            users_id: users_id,
                        },
                    }
                );
                await generateNotificationMessage({
                    source_id: dataGroupMember.id,
                    users_id: groupsData.users_id,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                    type: statusMember == 2 ? 5 : 1
                })
                return responseApi(res, [], null, "You have successfully Joined.", 0);
            }
        }
        const groupMembersData = await GroupMembersModels.create({
            users_id: users_id,
            groups_id: groups_id,
            status: statusMember,
            created_at: makeEpocTime(),
        });

        await generateNotificationMessage({
            source_id: groupMembersData.id,
            users_id: groupsData.users_id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
            type: statusMember == 2 ? 5 : 1
        })

        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const getGroups = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const userId = getToken.tod;
        const dataUser = await UsersModels.findOne({
            where: {
                id: userId,
            },
        });

        const contentDetailSlugs = req.params.contentDetailSlugs;
        const { page = 1, search_text = "", filter = "all", gender_filter = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = `WHERE cds.slug = :contentDetailSlugs`;
        const replacements = {
            contentDetailSlugs: contentDetailSlugs,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        if (search_text) {
            whereClause += ` AND g.title ILIKE :search_text`;
            replacements.search_text = `%${search_text}%`;
        }
        if (filter === "open" || gender_filter === "open") {
            whereClause += ` AND g.max_members > (SELECT COUNT(*) FROM ir_group_members gm2 WHERE gm2.groups_id = g.id AND gm2.status = 1) AND g.is_private = 0`;
        } else if (filter === "full") {
            whereClause += ` AND g.max_members <= (SELECT COUNT(*) FROM ir_group_members gm2 WHERE gm2.groups_id = g.id AND gm2.status = 1)`;
        }
        if (gender_filter === "male") {
            whereClause += ` AND g.is_gender = 1`;
        } else if (gender_filter === "female") {
            whereClause += ` AND g.is_gender = 2`;
        } else if (gender_filter === "private") {
            whereClause += ` AND g.is_private = 1`;
        }
        if (dataUser) {
            if (dataUser.is_anonymous == 0) {
                whereClause += ` AND g.is_anonymous = 0`;
            }
            // Removed gender visibility filter — show all groups, enforce on join
        }

        const query = `
            SELECT
                g.id AS id,
				CASE 
					WHEN g.max_members = (
                        SELECT COUNT(*) FROM (
                            SELECT DISTINCT gm.users_id
                            FROM ir_group_members gm
                            WHERE gm.groups_id = g.id AND gm.status = 1
                            UNION ALL
                            SELECT DISTINCT g_inner.users_id
                            FROM ir_groups g_inner
                            WHERE g_inner.id = g.id
                        ) AS all_members
                    ) THEN true
                ELSE false
                END AS is_max_member,
                CASE
                    WHEN g.users_id = ${getToken.tod} THEN 'creator'
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
                g.slug,
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
                        'name', CASE WHEN g.is_anonymous = 1 THEN u.display_name_anonymous ELSE u.display_name END,
                        'image', CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.photo END,
                        'username', CASE WHEN g.is_anonymous = 1 THEN u.username_anonymous ELSE u.username END
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
                            'role', member.role,
                            'username', member.username
                        )
                    )
                    FROM (
                        SELECT DISTINCT
                            CASE WHEN g.is_anonymous = 1 THEN u.display_name_anonymous ELSE u.display_name END AS display_name,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.photo END,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.username END,
                            'member' AS role
                        FROM ir_group_members gm
                        JOIN ir_users u ON u.id = gm.users_id AND (u.is_deleted IS NULL OR u.is_deleted = 0)
                        WHERE gm.groups_id = g.id AND gm.status = 1

                        UNION ALL

                        SELECT DISTINCT
                            CASE WHEN g.is_anonymous = 1 THEN creator.display_name_anonymous ELSE creator.display_name END AS display_name,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE creator.photo END,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE creator.username END,
                            'creator' AS role
                        FROM ir_users creator
                        WHERE creator.id = g.users_id
                          AND (creator.is_deleted IS NULL OR creator.is_deleted = 0)
                    ) AS member
                ) AS members
            FROM ir_groups g
            LEFT JOIN ir_content_details cds ON cds.id = g.content_details_id
            LEFT JOIN ir_users u ON u.id = g.users_id
            LEFT JOIN ir_citys c ON c.id = g.citys_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            ${whereClause}
            AND (u.is_deleted IS NULL OR u.is_deleted = 0)
            GROUP BY g.id, u.id, c.id, cds.id
            ORDER BY g.created_at DESC
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
            LEFT JOIN ir_users u ON u.id = g.users_id
            ${whereClause}
            AND (u.is_deleted IS NULL OR u.is_deleted = 0);
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
    try {
        const getToken = getDataUserUsingToken(req, res);
        const userId = getToken.tod;
        const getUsers = await UsersModels.findOne({
            where: {
                id: userId
            }
        });
        const groupSlugs = req.params.slugs;
        const replacements = {};
        let whereClause =
            "WHERE g.slug = :groupSlugs";
        replacements.groupSlugs = groupSlugs;
        const queryValidation = `
            SELECT
                g.id AS group_id,
                g.users_id AS creator_id,
                gm.status
            FROM ir_groups g
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id AND gm.users_id = ${getToken.tod}
            ${whereClause}
            GROUP BY g.id, gm.id;
        `;
        const validationGroupsData = await db.query(queryValidation, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });
        // Allow access if user is the creator, or is a member (status != 3 blocked)
        if (!validationGroupsData) {
            return responseApi(res, {}, {}, "Group not found", 1);
        }
        const isGroupCreator = validationGroupsData.creator_id === getToken.tod;
        if (!isGroupCreator && validationGroupsData.status === 3) {
            return responseApi(res, {}, {}, "Sorry You Cannot be see these group", 1);
        }
        const query = `
            SELECT
                g.slug AS slugs,
                g.title,
                TO_CHAR(TO_TIMESTAMP(g.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_group,
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
                            WHEN g.is_gender = 0 AND g.is_anonymous = 1 AND ul.is_anonymous = 0 THEN false
                            WHEN g.is_gender = 0 AND g.is_anonymous = 1 THEN true
                            WHEN g.is_gender = 0 THEN true
                            WHEN ul.gender != g.is_gender THEN false
                            WHEN g.is_anonymous = 1 AND ul.is_anonymous = 1  THEN true
                            WHEN g.is_anonymous = 1 AND ul.is_anonymous = 0  THEN false
                            ELSE true
                        END,
                    'message_title',
                        CASE 
                            WHEN ${getToken.tod} = 0 THEN 'Please log in to join'
                            WHEN g.is_gender = 0 AND g.is_anonymous = 1 AND ul.is_anonymous = 0 THEN 'This group is in anonymous mode'
                            WHEN g.is_gender = 0 AND g.is_anonymous = 1 THEN 'This group is in anonymous mode and unisex'
                            WHEN g.is_gender = 0 THEN ''
                            WHEN ul.gender != g.is_gender THEN  'Sorry, this group is ' ||  CASE  
                                WHEN g.is_gender = 1 THEN 'male'
                                WHEN g.is_gender = 2 THEN 'female'
                                ELSE 'unisex'
                                END || '-only.'
                            WHEN g.is_anonymous = 1 AND ul.is_anonymous = 1 THEN 'This group is in anonymous mode.'
                            WHEN g.is_anonymous = 1 AND ul.is_anonymous = 0 THEN 'This group is in anonymous mode.'
                            ELSE ''
                        END,
                    'message',
                        CASE 
                            WHEN ${getToken.tod} = 0 THEN 'You need to log in to join the group'
                            WHEN g.is_gender = 0 AND g.is_anonymous = 1 AND ul.is_anonymous = 0 THEN 'Sorry you cant join this group, change mode your account'
                            WHEN g.is_gender = 0 AND g.is_anonymous = 1 THEN 'This group is in anonymous mode and unisex'
                            WHEN g.is_gender = 0 THEN ''
                            WHEN ul.gender  != g.is_gender THEN 'It seems you dont meet the gender requirement for this group.'
                            WHEN g.is_anonymous = 1 AND ul.is_anonymous = 1 THEN 'You will use an anonymous nickname and your profile will be hidden in this group.'
                            WHEN g.is_anonymous = 1 AND ul.is_anonymous = 0 THEN 'Sorry you cant join , Please change your account on anonymous mode.'
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
                    'name', CASE WHEN g.is_anonymous = 1 THEN u.display_name_anonymous ELSE u.display_name END,
                    'image', CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.photo END,
                    'username', CASE WHEN g.is_anonymous = 1 THEN u.username_anonymous ELSE u.username END
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
                            'role', member.role,
                            'username', member.username
                        )
                    )
                    FROM (
                        SELECT DISTINCT
                            CASE WHEN g.is_anonymous = 1 THEN u.display_name_anonymous ELSE u.display_name END AS display_name,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.photo END AS photo,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.username END AS username,
                            'member' AS role
                        FROM ir_group_members gm
                        JOIN ir_users u ON u.id = gm.users_id AND (u.is_deleted IS NULL OR u.is_deleted = 0)
                        WHERE gm.groups_id = g.id AND gm.status = 1

                        UNION ALL

                        SELECT DISTINCT
                            CASE WHEN g.is_anonymous = 1 THEN creator.display_name_anonymous ELSE creator.display_name END AS display_name,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE creator.photo END AS photo,
                            creator.username AS username,
                            'creator' AS role
                        FROM ir_users creator
                        WHERE creator.id = g.users_id
                          AND (creator.is_deleted IS NULL OR creator.is_deleted = 0)
                    ) AS member
                ) AS members,
                CASE
                    WHEN g.users_id = ${getToken.tod} THEN (
                        SELECT json_agg(
                            json_build_object(
                                'name', CASE 
                                    WHEN g.is_anonymous = 1 THEN u.display_name_anonymous 
                                    ELSE u.display_name 
                                END,
                                'image', CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.photo END,
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
            LEFT JOIN ir_users ul ON ul.id = ${getToken.tod}
            LEFT JOIN ir_citys c ON c.id = g.citys_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
            LEFT JOIN ir_content_details cds ON g.content_details_id = cds.id
            ${whereClause}
            GROUP BY g.id, u.id, c.id, cds.id, ul.id;
        `;

        const groupsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        let responseData = {};
        if (groupsData.length > 0) {
            responseData = groupsData[0];
            // if (getUsers.is_anonymous != (responseData.policies.is_anonymous_mode ? 1 : 0)) {
            //     return responseApi(
            //         res,
            //         {},
            //         {
            //             assets_image_url: process.env.APP_BUCKET_IMAGE,
            //         },
            //         "Data retrieved successfully",
            //         0
            //     );
            // }
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
        let whereClause = `WHERE g.slug = :groupSlugs 
            AND g.users_id = :userToken AND u.username = :username`;
        replacements.groupSlugs = groupSlugs;
        replacements.userToken = getToken.tod;
        replacements.username = username;
        const queryValidation = `
            SELECT
			gm.status,
            gm.id,
            gm.users_id
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
                "Cannot be approve member",
                1
            );
        } else {
            if (validationGroupsData?.status === 3) {
                return responseApi(
                    res,
                    {},
                    {},
                    "You are blocked",
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

        // Notify the approved member
        await generateNotificationMessage({
            source_id: validationGroupsData?.id,
            users_id: validationGroupsData?.users_id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
            type: 10
        });

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

export const rejectMember = async (req, res) => {
    try {
        const { username } = req.body;
        const getToken = getDataUserUsingToken(req, res);
        const groupSlugs = req.params.slug;

        const replacements = {
            groupSlugs,
            userToken: getToken.tod,
            username,
        };

        const query = `
            SELECT gm.id, gm.status, gm.users_id
            FROM ir_groups g
            JOIN ir_group_members gm ON gm.groups_id = g.id
            JOIN ir_users u ON u.id = gm.users_id
            WHERE g.slug = :groupSlugs
              AND g.users_id = :userToken
              AND u.username = :username
        `;

        const memberData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            plain: true,
        });

        if (!memberData) {
            return responseApi(res, {}, {}, "Member not found", 1);
        }

        // Notify the rejected member before destroying
        await generateNotificationMessage({
            source_id: memberData.id,
            users_id: memberData.users_id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
            type: 11
        });

        await GroupMembersModels.destroy({
            where: { id: memberData.id },
        });

        return responseApi(res, [], null, "Member rejected successfully", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const getMemberNeedApprovalGroup = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const groupSlug = req.params.slugGroup;
        const replacements = {
            group_slug: groupSlug,
            limit,
            offset,
        };
        const query = `
            SELECT 
                    u.display_name AS name,
                    u.photo AS image,
                    u.username,
                    TO_CHAR(TO_TIMESTAMP(gm.created_at), 'YYYY-MM-DD HH24:MI:SS') AS joined_date
                FROM 
                    ir_group_members gm
                JOIN 
                    ir_users u ON u.id = gm.users_id
                JOIN
                    ir_groups g ON g.id = gm.groups_id
                WHERE 
                    LOWER(REPLACE(g.title, ' ', '-') || '-' || CAST(g.id AS TEXT)) = :group_slug
                    AND gm.status = 2
            LIMIT :limit OFFSET :offset
`;


        const data = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });
        const countQuery = `
        SELECT COUNT(*) AS total_count
        FROM ir_group_members gm
        JOIN ir_groups g ON g.id = gm.groups_id
        WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || CAST(g.id AS TEXT)) = :group_slug
        AND gm.status = 2
    `;


        const totalResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const total = parseInt(totalResult[0]?.total_count || 0, 10);
        const totalPages = Math.ceil(total / limit);

        return responseApi(
            res,
            data,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        // Catch and log any errors
        console.error("Error in getMemberNeedApprovalGroup:", error);
        return responseApi(res, [], null, "Internal server error", 1);
    }
};


export const deleteGroup = withTransaction(async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;

        const dataUser = await UsersModels.findOne({ where: { id: users_id } });

        const groupSlugs = req.params.slugGroup;
        const query = `
        SELECT g.id, g.users_id FROM ir_groups g
        WHERE g.slug = :groupSlugs
        GROUP BY g.id;
      `;

        const groupsData = await db.query(query, {
            replacements: { groupSlugs },
            type: db.QueryTypes.SELECT,
            plain: true,
        });
        if (!dataUser) {
            return responseApi(res, [], null, "Sorry You Cannot be delete these group 1", 1);
        }
        if (dataUser.id !== groupsData.users_id) {
            return responseApi(res, [], null, "Sorry You Cannot be delete these group 2", 1);
        }

        if (!groupsData?.id) {
            return responseApi(res, [], null, "Group not found", 1);
        }

        const groups_id = groupsData.id;
        await Promise.all([
            GroupMembersModels.destroy({ where: { groups_id } }),
            ChatStatusGroupsModels.destroy({ where: { groups_id } }),
            ChatGroupsModels.destroy({ where: { groups_id } }),
            GroupsModels.destroy({ where: { id: groups_id } })
        ]);

        return responseApi(res, [], null, "Data has been deleted", 0);
    } catch (error) {
        console.error("deleteGroup error:", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
});

export const leaveGroup = withTransaction(async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const users_id = getToken.tod;

        const dataUser = await UsersModels.findOne({ where: { id: users_id } });
        if (!dataUser) {
            return responseApi(res, [], null, "Sorry You Cannot be leave these group", 1);
        }
        const username = dataUser.username;
        const groupSlugs = req.params.slugGroup;
        const replacements = {};
        let whereClause = `WHERE g.slug = :groupSlugs 
            AND gm.users_id = :userToken`;
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
                "Sorry Any problem",
                1
            );
        } else {
            if (validationGroupsData?.status === 3) {
                return responseApi(
                    res,
                    {},
                    {},
                    "You are blocked",
                    1
                );
            }
        }
        await GroupMembersModels.update(
            {
                status: 4,
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
            "Successfully leave group",
            0
        );
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
});

