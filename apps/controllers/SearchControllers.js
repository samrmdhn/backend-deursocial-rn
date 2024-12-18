import { responseApi } from "../../libs/RestApiHandler.js";
import db from "../../configs/Database.js";
import { getDataUserUsingToken } from "../../helpers/customHelpers.js";
import UsersModels from "../models/UsersModels.js";

export const searchData = (req, res) => {
    try {
        const searchType = req.params.type;
        if (searchType === "event") {
            return dataEvent(req, res);
        } else if (searchType === "users") {
            return dataUser(req, res);
        }
        return responseApi(res, [], null, "Data has been retrieved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

const dataEvent = async (req, res) => {
    try {
        const { page = 1, search_text = "" } = req.body;
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
                    WHEN cd.is_trending = 0 THEN 'ended' 
                    WHEN cd.is_trending = 1 THEN 'ongoing' 
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
    const getToken = await getDataUserUsingToken(req, res);
    try {
        const userId = getToken.tod;
        const replacements = { userId };
        const userData = await UsersModels.findOne({
            where: { id: userId },
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
                        FROM ir_follower_users ifs
                        WHERE ifs.following_id = u.id
                        ${!isOwner ? `AND ifs.follower_id = u.id` : ""}
                    ) THEN true
                    ELSE false
                END
            ) AS followed_user,
            (
                SELECT COALESCE(json_agg(
                    json_build_object(
                        'username', u_f.username
                    )
                ), '[]')
                FROM ir_follower_users f
                INNER JOIN ir_users u_f ON u_f.id = f.follower_id
                ${
                    !isOwner
                        ? `WHERE f.following_id = u.id AND f.follower_id = u.id`
                        : `WHERE f.following_id = u.id`
                }
                LIMIT 10
            ) AS followers,
            (
                SELECT COUNT(*)
                FROM ir_follower_users f
                ${
                    !isOwner
                        ? `WHERE f.following_id = u.id AND f.follower_id = u.id`
                        : `WHERE f.following_id = u.id`
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
                ) AS total_post,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'slug', pcds.slug,
                            'type', 
                                CASE 
                                    WHEN pcds.type = 0 THEN 'global'
                                    WHEN pcds.type = 1 THEN 'event'
                                    ELSE 'ticket' 
                                END,
                            'images', (
                                SELECT fpcds.file
                                FROM ir_file_post_content_details fpcds
                                WHERE fpcds.post_content_details_id = pcds.id
                                ORDER BY fpcds.id ASC
                                LIMIT 1
                            )
                        )
                    ), '[]')
                    FROM ir_post_content_details pcds
                    LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
                    WHERE pcds.users_id = u.id AND (pcds.type = 0 OR pcds.type = 1)
                    LIMIT 9
                ) AS user_posts,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'slug', pcds.slug,
                            'type', 
                                CASE 
                                    WHEN pcds.type = 0 THEN 'global'
                                    WHEN pcds.type = 1 THEN 'event'
                                    ELSE 'ticket' 
                                END,
                            'images', (
                                SELECT fpcds.file
                                FROM ir_file_post_content_details fpcds
                                WHERE fpcds.post_content_details_id = pcds.id
                                ORDER BY fpcds.id ASC
                                LIMIT 1
                            )
                        )
                    ), '[]')
                    FROM ir_post_content_details pcds
                    LEFT JOIN ir_file_post_content_details fpcds ON fpcds.post_content_details_id = pcds.id
                    WHERE pcds.users_id = u.id AND pcds.type = 2
                    LIMIT 9
                ) AS user_post_tickets
            FROM ir_users u
            GROUP BY u.id;
        `;

        const queryUsers = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
            // plain: true,
        });

        const response = queryUsers.map((queryUser) => ({
            email: queryUser.email,
            phone: queryUser.phone,
            gender: queryUser.gender,
            display_name: queryUser.display_name,
            username: queryUser.username,
            description: queryUser.description,
            image: process.env.APP_BUCKET_IMAGE + queryUser.photo,
            followers: queryUser.followers || [],
            total_followers: queryUser.total_followers || 0,
            followed_user: !isOwner ? queryUser.followed_user : false,
            user_posts: queryUser.user_posts,
            user_post_tickets: queryUser.user_post_tickets,
            total_post: queryUser.total_post,
            total_event_followed: queryUser.total_event_followed,
        }));

        return responseApi(res, response, null, "Data has been retrieved", 0);
    } catch (error) {
        console.error("Error:", error);
        return responseApi(res, [], null, "Server error", 1);
    }
};
