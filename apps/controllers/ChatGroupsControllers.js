import db from "../../configs/Database.js";
import {
    dateToEpochTime,
    getDataUserUsingToken,
    isValidJwt,
} from "../../helpers/customHelpers.js";
import ChatGroupsModels from "../models/ChatGroupsModels.js";
import { jwtDecode } from "jwt-decode";
import { Sequelize } from "sequelize";
import ChatStatusGroupsModels from "../models/ChatStatusGroupsModels.js";
import GroupMembersModels from "../models/GroupMembersModels.js";
import { responseApi } from "../../libs/RestApiHandler.js";
const Op = Sequelize.Op;

let ioInstance;

export const initializeSocket = (io) => {
    ioInstance = io;
    io.on("connection", (socket) => {
        socket.on("joinGroup", async (data) => {
            const groupsSlug = data.slug;
            const usersIdToken = data.userId;
            if (!groupsSlug) return;

            try {
                const limit = 20;
                const offset = 0;

                const replacements = {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                };

                // Prepare WHERE clause to match the slug
                let whereClause =
                    "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupsSlug";
                replacements.groupsSlug = groupsSlug;

                const query = `
                    SELECT
                        cg.id as chat_groups_id,
                        u.id as user_id,
                        u.photo as image,
                        TO_CHAR(TO_TIMESTAMP(cg.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                        cg.messages,
                        u.display_name,
                        u.display_name_anonymous,
                        LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug
                    FROM
                        ir_chat_groups cg
                        INNER JOIN ir_users u ON u.id = cg.users_id
                        INNER JOIN ir_groups g ON g.id = cg.groups_id
                        ${whereClause}
                        ORDER BY cg.id DESC
                    LIMIT :limit OFFSET :offset;
                `;
                const messages = await db.query(query, {
                    replacements,
                    type: db.QueryTypes.SELECT,
                });

                const formattedMessages = messages.map((msg) => ({
                    users_id: msg.user_id,
                    display_name: msg.display_name,
                    image: process.env.APP_BUCKET_IMAGE + "/" + msg.image,
                    display_name_anonymous: msg.display_name_anonymous,
                    groupSlug: msg.slug,
                    created_at: msg.created_at,
                    message: msg.messages,
                }));

                socket.emit("initialMessages", formattedMessages.reverse());
                const queryDeletedUser = `
                    SELECT DISTINCT ON (u.id)
                        cg.id as chat_groups_id,
                        u.id as user_id,
                        u.photo as image,
                        TO_CHAR(TO_TIMESTAMP(cg.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                        cg.messages,
                        u.display_name,
                        u.display_name_anonymous,
                        LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug
                    FROM
                        ir_chat_groups cg
                        INNER JOIN ir_users u ON u.id = cg.users_id
                        INNER JOIN ir_groups g ON g.id = cg.groups_id
                        ${whereClause}
                        ORDER BY u.id, cg.id DESC;
                `;
                const messagesDeletedUser = await db.query(queryDeletedUser, {
                    replacements,
                    type: db.QueryTypes.SELECT,
                });

                const conditions = messagesDeletedUser.map((item) => ({
                    [Op.and]: [
                        { chat_groups_id: item.chat_groups_id },
                        { users_id: usersIdToken },
                    ],
                }));
                const result = await ChatStatusGroupsModels.destroy({
                    where: {
                        [Op.or]: conditions,
                    },
                });
                socket.join(groupsSlug);
                console.log(`Socket ${socket.id} joined group: ${groupsSlug}`);
            } catch (error) {
                console.error("Error fetching initial messages:", error);
            }
        });

        socket.on("fetchMoreMessages", async (data) => {
            const groupsSlug = data.slug;
            const offset = data.offset;
            if (!groupsSlug) return;

            try {
                const limit = 20; // number of messages to fetch
                const replacements = {
                    limit: limit,
                    offset: offset || 0,
                    groupsSlug: groupsSlug,
                };

                // Raw SQL query for fetching more messages based on the slug
                const query = `
                    SELECT
                        u.id as user_id,
                        u.photo as image,
                        cg.messages,
                        TO_CHAR(TO_TIMESTAMP(cg.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                        u.display_name,
                        u.display_name_anonymous,
                        LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug
                    FROM
                        ir_chat_groups cg
                        INNER JOIN ir_users u ON u.id = cg.users_id
                        INNER JOIN ir_groups g ON g.id = cg.groups_id
                    WHERE
                        LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupsSlug
                        ORDER BY cg.id DESC
                    LIMIT :limit OFFSET :offset;
                `;

                const messages = await db.query(query, {
                    replacements,
                    type: db.QueryTypes.SELECT,
                });

                const formattedMessages = messages.map((msg) => ({
                    users_id: msg.user_id,
                    display_name: msg.display_name,
                    image: process.env.APP_BUCKET_IMAGE + "/" + msg.image,
                    created_at: msg.created_at,
                    display_name_anonymous: msg.display_name_anonymous,
                    slug: msg.slug,
                    message: msg.messages,
                }));

                socket.emit("moreMessages", formattedMessages.reverse());
            } catch (error) {
                console.error("Error fetching more messages:", error);
            }
        });
    });
};

export const sendMessageToGroup = async (req, res) => {
    const { message } = req.body;
    let users_id;
    const usersToken = getDataUserUsingToken(req, res);
    users_id = usersToken.tod;
    const usersIdToken = usersToken.tod;
    if (message.length > 100) {
        return res.status(400).send("Message too long");
    }
    if (Number(users_id) === 0) {
        return res.status(400).send("You cannot joined that");
    }

    const groupSlugs = req.params.groupSlugs;

    if (!message || !users_id) {
        return res.status(400).send("Invalid request payload");
    }

    if (!ioInstance) {
        return res.status(500).send("Socket.IO is not initialized");
    }

    try {
        // Assuming you need to map the slug to group ID
        const groupQuery = `
            SELECT g.id, g.users_id
            FROM ir_groups g
            WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupSlugs
        `;

        const groupResult = await db.query(groupQuery, {
            replacements: { groupSlugs },
            type: db.QueryTypes.SELECT,
        });

        if (groupResult.length === 0) {
            return res.status(404).send("Group not found");
        }

        const groupId = groupResult[0].id;
        const getUserInGroup = await GroupMembersModels.findAll({
            where: {
                groups_id: groupId,
                users_id: {
                    [Op.ne]: users_id,
                },
            },
            attributes: [
                Sequelize.fn("DISTINCT", Sequelize.col("users_id")),
                "users_id",
            ],
        });
        const chat = await ChatGroupsModels.create({
            groups_id: groupId,
            messages: message,
            users_id: users_id,
            created_at: dateToEpochTime(req.headers["x-date-for"]),
        });
        let dataToInsert = [];
        if (getUserInGroup.length > 0) {
            const userIds = getUserInGroup.map((user) => user.users_id);
            dataToInsert = userIds.map((userId) => ({
                users_id: userId,
                chat_groups_id: chat.id,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }));
        }
        if (groupResult[0].users_id !== usersIdToken) {
            dataToInsert = [
                ...dataToInsert,
                {
                    users_id: groupResult[0].users_id,
                    chat_groups_id: chat.id,
                    created_at: dateToEpochTime(req.headers["x-date-for"]),
                },
            ];
        }

        await ChatStatusGroupsModels.bulkCreate(dataToInsert)
            .then(() => {
                console.log("Data berhasil disimpan di ChatStatusGroupsModels");
            })
            .catch((error) => {
                console.error("Gagal menyimpan data:", error);
            });

        const limit = 20;
        const offset = 0;

        const replacements = {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };

        // Prepare WHERE clause to match the slug
        let whereClause =
            "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupSlugs";
        replacements.groupSlugs = groupSlugs;
        if (chat.id) {
            whereClause = "AND cg.id = :idCg";
            replacements.idCg = chat.id;
        }

        // Main query using the slug for fetching messages
        const query = `
            SELECT
                u.id as user_id,
                u.photo as image,
                cg.messages,
                TO_CHAR(TO_TIMESTAMP(cg.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                u.display_name,
                u.display_name_anonymous,
                LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug
            FROM
                ir_chat_groups cg
                INNER JOIN ir_users u ON u.id = cg.users_id
                INNER JOIN ir_groups g ON g.id = cg.groups_id
                ${whereClause}
                ORDER BY cg.id DESC
            LIMIT :limit OFFSET :offset;
        `;
        const dataMessages = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const formattedMessages = dataMessages.map((msg) => ({
            users_id: msg.user_id,
            display_name: msg.display_name,
            image: process.env.APP_BUCKET_IMAGE + "/" + msg.image,
            created_at: msg.created_at,
            display_name_anonymous: msg.display_name_anonymous,
            groupSlug: msg.slug,
            message: msg.messages,
        }));

        ioInstance.to(groupSlugs).emit("newMessage", formattedMessages[0]);

        console.log(`Message sent to group ${groupSlugs}: ${message}`);
        return res
            .status(200)
            .send({ message: "Message sent", data: formattedMessages });
    } catch (error) {
        console.error("Error sending message:", error);
        return res.status(500).send("Internal server error");
    }
};

export const getGroupsMessages = async (req, res) => {
    try {
        const getToken = getDataUserUsingToken(req, res);
        const { page = 1, title = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = `WHERE gm.status = 1 AND gm.users_id = :userToken OR g.users_id = :userToken`;
        const replacements = {
            userToken: getToken.tod,
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
                cds.title AS event_name,
                cds.slug AS event_slug,
                CASE
                    WHEN cds.status = 0 THEN 'ended' 
                    WHEN cds.status = 1 THEN 'ongoing' 
                    WHEN cds.status = 2 THEN 'upcoming' 
                    ELSE 'not joined'
                END AS event_status,
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
                ) AS members,
                (
                    SELECT COUNT(*) 
                        FROM ir_chat_groups_status as cgs
                        INNER JOIN ir_chat_groups cg ON cg.id = cgs.chat_groups_id
                        WHERE cg.groups_id = g.id
                ) AS total_unread_messages,
                (
                    SELECT json_build_object(
                        'message', cg.messages,
                        'sender', u2.display_name,
                        'timestamp', TO_CHAR(TO_TIMESTAMP(cg.created_at), 'YYYY-MM-DD HH24:MI:SS')
                    )
                    FROM ir_chat_groups cg
                    LEFT JOIN ir_users u2 ON cg.users_id = u2.id
                    WHERE cg.groups_id = g.id
                    ORDER BY cg.created_at DESC
                    LIMIT 1
                ) AS last_chat
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
            LEFT JOIN ir_group_members gm ON gm.groups_id = g.id
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
