import db from "../../configs/Database.js";
import {
    getDataUserUsingToken,
} from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import UsersModels from "../models/UsersModels.js";

export const getGroupsMessages = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const userId = getToken.tod;
        const dataUser = await UsersModels.findOne({ where: { id: userId } });
        const { page = 1, title = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = `
            WHERE (
                (gm.users_id = :userToken AND gm.status = 1)
                OR g.users_id = :userToken
            )
        `;

        if (title) {
            whereClause += ` AND g.title ILIKE :title`;
        }
        if (dataUser?.is_anonymous === 0) {
            whereClause += ` AND g.is_anonymous = 0`;
        }

        const replacements = {
            userToken: userId,
            title: `%${title}%`,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };

        const query = `
            SELECT
                g.id AS id,
                cds.title AS event_name,
                cds.slug AS event_slug,
                CASE
                    WHEN cds.status = 0 THEN 'ended'
                    WHEN cds.status = 1 THEN 'ongoing'
                    WHEN cds.status = 2 THEN 'upcoming'
                    ELSE 'not joined'
                END AS event_status,
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
                ) AS user,
                json_build_object(
                    'city', json_build_object(
                        'id', c.id,
                        'name', c.title
                    )
                ) AS location,
                (
                    SELECT COUNT(*) FROM (
                        SELECT DISTINCT gm2.users_id
                        FROM ir_group_members gm2
                        WHERE gm2.groups_id = g.id AND gm2.status = 1
                        UNION ALL
                        SELECT DISTINCT g_inner.users_id
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
                            CASE WHEN g.is_anonymous = 1 THEN u2.display_name_anonymous ELSE u2.display_name END AS display_name,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE u2.photo END,
                            'member' AS role
                        FROM ir_group_members gm2
                        JOIN ir_users u2 ON u2.id = gm2.users_id
                        WHERE gm2.groups_id = g.id AND gm2.status = 1

                        UNION ALL

                        SELECT DISTINCT
                            CASE WHEN g.is_anonymous = 1 THEN u.display_name_anonymous ELSE u.display_name END AS display_name,
                            CASE WHEN g.is_anonymous = 1 THEN '' ELSE u.photo END,
                            'creator' AS role
                    ) AS member
                ) AS members,
                (
                    SELECT COUNT(*) FROM ir_chat_groups_status cgs
                    WHERE cgs.groups_id = g.id AND cgs.status = 1 AND cgs.users_id = :userToken
                ) AS total_unread_messages,
                (
                    SELECT COUNT(*) FROM ir_chat_groups cg
                    WHERE cg.groups_id = g.id AND cg.users_id = :userToken
                ) AS last_chat
            FROM ir_groups g
            LEFT JOIN ir_content_details cds ON cds.id = g.content_details_id
            LEFT JOIN ir_users u ON u.id = g.users_id
            LEFT JOIN ir_citys c ON c.id = g.citys_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id AND gm.status = 1 AND g.is_gender IN (0${dataUser?.gender ? `, ${dataUser.gender}` : ''})
            ${whereClause}
            ORDER BY GREATEST(COALESCE(gm.created_at, g.created_at), g.created_at) DESC
            LIMIT :limit OFFSET :offset;
        `;

        const groupsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const countQuery = `
            SELECT COUNT(DISTINCT g.id) AS total_count
            FROM ir_groups g
            LEFT JOIN ir_content_details cds ON cds.id = g.content_details_id
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id AND gm.status = 1 AND gm.users_id = :userToken
            ${whereClause};
        `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            groupsData,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: limit,
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data retrieved successfully",
            0
        );
    } catch (error) {
        console.error(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
