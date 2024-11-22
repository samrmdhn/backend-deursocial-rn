import db from "../../configs/Database.js";
import ChatGroupsModels from "../models/ChatGroupsModels.js";

let ioInstance;

export const initializeSocket = (io) => {
    ioInstance = io;
    io.on("connection", (socket) => {
        socket.on("joinGroup", async (data) => {
            const groupsSlug = data.slug
            const users_id = data.usersId
            if (!groupsSlug) return;

            socket.join(groupsSlug);
            try {
                const limit = 10;
                const offset = 0;

                const replacements = {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                };

                // Prepare WHERE clause to match the slug
                let whereClause =
                    "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupsSlug";
                replacements.groupsSlug = groupsSlug;

                // Main query using the slug for fetching messages
                const query = `
                    SELECT
                        u.id as user_id,
                        cg.messages,
                        u.display_name,
                        u.display_name_anonymous,
                        LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug,
                        CASE
                            WHEN u.id = ${users_id} THEN 'sender'
                            ELSE 'receiver' -- This can be customized as needed
                        END AS type_users
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
                    display_name_anonymous: msg.display_name_anonymous,
                    type_users: msg.type_users,
                    groupSlug: msg.slug,
                    message: msg.messages,
                }));

                socket.emit("initialMessages", formattedMessages);
            } catch (error) {
                console.error("Error fetching initial messages:", error);
            }
        });

        socket.on("fetchMoreMessages", async (data) => {
            const groupsSlug = data.slug
            const users_id = data.usersId
            const offset = data.offset
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
                        cg.messages,
                        u.display_name,
                        u.display_name_anonymous,
                        LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug,
                        CASE
                            WHEN u.id = ${users_id} THEN 'sender'
                            ELSE 'receiver' -- This can be customized as needed
                        END AS type_users
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
                    display_name_anonymous: msg.display_name_anonymous,
                    type_users: msg.type_users,
                    slug: msg.slug,
                    message: msg.messages,
                }));

                socket.emit("moreMessages", formattedMessages);
            } catch (error) {
                console.error("Error fetching more messages:", error);
            }
        });
    });
};

export const sendMessageToGroup = async (req, res) => {
    const { groupsSlug, message, users_id } = req.body;

    if (!groupsSlug || !message || !users_id) {
        return res.status(400).send("Invalid request payload");
    }

    if (!ioInstance) {
        return res.status(500).send("Socket.IO is not initialized");
    }

    try {
        // Assuming you need to map the slug to group ID
        const groupQuery = `
            SELECT g.id
            FROM ir_groups g
            WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupsSlug
        `;

        const groupResult = await db.query(groupQuery, {
            replacements: { groupsSlug },
            type: db.QueryTypes.SELECT,
        });

        if (groupResult.length === 0) {
            return res.status(404).send("Group not found");
        }

        const groupId = groupResult[0].id;

        const chat = await ChatGroupsModels.create({
            groups_id: groupId,
            messages: message,
            users_id: users_id,
        });

        const limit = 10;
        const offset = 0;

        const replacements = {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };

        // Prepare WHERE clause to match the slug
        let whereClause =
            "WHERE LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) = :groupsSlug";
        replacements.groupsSlug = groupsSlug;
        if (chat.id) {
            whereClause = "AND cg.id = :idCg";
            replacements.idCg = chat.id;
        }

        // Main query using the slug for fetching messages
        const query = `
            SELECT
                u.id as user_id,
                cg.messages,
                u.display_name,
                u.display_name_anonymous,
                LOWER(REPLACE(g.title, ' ', '-') || '-' || g.id) AS slug,
                CASE
                    WHEN u.id = ${users_id} THEN 'sender'
                    ELSE 'receiver' -- This can be customized as needed
                END AS type_users
            FROM
                ir_chat_groups cg
                INNER JOIN ir_users u ON u.id = cg.users_id
                INNER JOIN ir_groups g ON g.id = cg.groups_id
                ORDER cg.id DESC
                ${whereClause}
            LIMIT :limit OFFSET :offset;
        `;
        const messages = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const formattedMessages = messages.map((msg) => ({
            users_id: msg.user_id,
            display_name: msg.display_name,
            display_name_anonymous: msg.display_name_anonymous,
            type_users: msg.type_users,
            groupSlug: msg.slug,
            message: msg.messages,
        }));

        ioInstance.to(groupsSlug).emit("newMessage", formattedMessages[0]);

        console.log(`Message sent to group ${groupsSlug}: ${message}`);
        return res.status(200).send("Message sent");
    } catch (error) {
        console.error("Error sending message:", error);
        return res.status(500).send("Internal server error");
    }
};
