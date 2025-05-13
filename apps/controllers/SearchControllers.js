import { responseApi } from "../../libs/RestApiHandler.js";
import db from "../../configs/Database.js";
import { cuttingString, getDataUserUsingToken } from "../../helpers/customHelpers.js";
import UsersModels from "../models/UsersModels.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";

export const searchData = (req, res) => {
    try {
        const searchType = req.params.type;
        if (searchType === "event") {
            return dataEvent(req, res);
        } else if (searchType === "users") {
            return dataUser(req, res);
        } else if (searchType === "groupEvent") {
            return dataGroupEvent(req, res);
        }
        return responseApi(res, [], null, "Data has been retrieved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const dataGroupEvent = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const { page = 1, search_text = "" } = req.body;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = `WHERE g.title ILIKE :search_text`;
        const replacements = {
            search_text: `%${search_text}%`,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };

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
                        'name', u.display_name,
                        'image', u.photo,
                        'username', u.username
                    ) AS users,
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

        let responseData = groupsData
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

const dataEvent = async (req, res) => {
    try {
        const { page = 1, search_text = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Construct where clause with parameterized values
        let whereClause = ``;
        const replacements = {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };

        if (search_text) {
            whereClause += ` WHERE cd.title ILIKE :title`;
            replacements.title = `%${search_text}%`;
        }

        const query = `
            SELECT 
                cd.id AS "id",
                cd.title AS "title",
                cd.slug AS "slug",
                TO_CHAR(TO_TIMESTAMP(cd.schedule_start), 'YYYY-MM-DD HH24:MI:SS') AS "schedule_start",
                TO_CHAR(TO_TIMESTAMP(cd.schedule_end), 'YYYY-MM-DD HH24:MI:SS') AS "schedule_end",
                TO_CHAR(TO_TIMESTAMP(cd.date_start), 'YYYY-MM-DD HH24:MI:SS') AS "date_start",
                TO_CHAR(TO_TIMESTAMP(cd.date_end), 'YYYY-MM-DD HH24:MI:SS') AS "date_end",
                cd.description AS "description",
                cd.image AS "image",
                CASE WHEN cd.is_trending = 1 THEN true ELSE false END AS "is_trending",
                CASE 
                    WHEN cd.status = 0 THEN 'ended' 
                    WHEN cd.status = 1 THEN 'ongoing' 
                    ELSE 'upcoming' 
                END AS "status",
                json_build_object(
                    'id', tcd.id,
                    'name', tcd.name
                ) AS "type_content_details",
                json_build_object(
                    'id', eo.id,
                    'name', eo.name,
                    'image', eo.image
                ) AS "event_organizers",
                                 (
                    SELECT json_build_object(
                        'total_followers', COUNT(*),
                        'users', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', u.id,
                                    'display_name', u.display_name,
                                    'image', u.photo
                                )
                            )
                            FROM ir_content_detail_followers cdf
                            JOIN ir_users u ON cdf.users_id = u.id
                            WHERE cdf.content_details_id = cd.id
                            LIMIT 3
                        )
                    )
                    FROM ir_content_detail_followers cdf
                    WHERE cdf.content_details_id = cd.id
                ) AS "followers",
                (
                    SELECT COUNT(*) AS total_posts
                    FROM ir_segmented_post_content_details gp 
                    WHERE gp.content_details_id = cd.id
                ) AS "total_posts",
                (
                    SELECT COUNT(*) AS total_groups
                    FROM ir_groups g 
                    WHERE g.content_details_id = cd.id
                ) AS "total_groups",
                json_build_object(
                    'region', json_build_object(
                        'id', co.id,
                        'name', co.title
                    ),
                    'city', json_build_object(
                        'id', ci.id,
                        'name', ci.title
                    ),
                    'venue', json_build_object(
                        'id', v.id,
                        'name', v.title
                    )
                ) AS "location"
            FROM ir_content_details cd
            LEFT JOIN ir_type_content_details tcd ON cd.type_content_details_id = tcd.id
            LEFT JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id
            LEFT JOIN ir_vanues v ON cd.vanues_id = v.id
            LEFT JOIN ir_citys ci ON v.citys_id = ci.id
            LEFT JOIN ir_provinces p ON v.provinces_id = p.id
            LEFT JOIN ir_countries co ON v.countries_id = co.id
            ${whereClause}
            GROUP BY cd.id, tcd.id, eo.id, co.id, ci.id, v.id, p.id
            LIMIT :limit OFFSET :offset;
        `;

        const contentData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM (
                SELECT 1
                FROM ir_content_details cd
                ${whereClause}
                LIMIT :limit OFFSET :offset
            ) AS subquery;
            ;
        `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);

        const responseData = contentData;

        return responseApi(
            res,
            responseData,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data Success Saved",
            0
        );
    } catch (error) {
        console.log("Err get data Event", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

export const dataUser = async (req, res) => {
    try {
        const getToken = await getDataUserUsingToken(req, res);
        const userId = getToken.tod;

        const userData = await UsersModels.findOne({ where: { id: userId } });

        const { page = 1, search_text = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        const isOwner = Number(userData?.id) === Number(userId);

        const queryFollowedUser = `
            (
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_following_users ifs
                        WHERE 
                            ifs.following_id = ${getToken.tod} AND ifs.users_id = u.id
                    ) THEN true
                    ELSE false
                END
            ) AS followed_user
        `;

        const whereClause = `WHERE u.display_name ILIKE :search_text`;

        const query = `
            SELECT
                u.id,
                u.username,
                u.display_name,
                u.description,
                u.photo,
                u.gender
            FROM ir_users u
            ${whereClause}
            ORDER BY u.display_name ASC
            LIMIT :limit OFFSET :offset;
        `;

        const replacements = {
            user_id: userId,
            search_text: `%${search_text}%`,
            limit,
            offset,
        };

        const users = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const response = users.map((user) => ({
            display_name: user.display_name,
            username: user.username,
            description: cuttingString(user.description, 22),
            image: process.env.APP_BUCKET_IMAGE + user.photo,
            followed_user: user.followed_user
        }));

        return responseApi(res, response, null, "Data has been retrieved", 0);
    } catch (error) {
        console.error("Error:", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};

