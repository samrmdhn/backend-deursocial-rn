import db from "../../configs/Database.js";
import { dateToEpochTime } from "../../helpers/customHelpers.js";
import ChatGroupsModels from "../models/ChatGroupsModels.js";
import { jwtDecode } from "jwt-decode";

let ioInstance;

export const initializeSocket = (io) => {
    ioInstance = io;
    io.on("connection", (socket) => {
        const token = socket.handshake.headers.authorization;
        // console.log("ïni token", token)
        socket.on("joinGroup", async (data) => {
            const groupsSlug = data.slug;
            if (!groupsSlug) return;

            socket.join(groupsSlug);
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

                // Main query using the slug for fetching messages
                const query = `
                    SELECT
                        u.id as user_id,
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
                    display_name_anonymous: msg.display_name_anonymous,
                    groupSlug: msg.slug,
                    created_at: msg.created_at,
                    message: msg.messages,
                }));

                socket.emit("initialMessages", formattedMessages.reverse());
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
    const { messages, created_at } = req.body;
    let token = req.headers["authorization"];
    let users_id;
    if (token && token.startsWith("Bearer ")) {
        const usersToken = jwtDecode(token.slice(7));
        users_id = usersToken.tod;
        if (Number(users_id) === 0) {
            return res.status(400).send("You cannot joined that");
        }
    }
    const groupSlugs = req.params.groupSlugs;

    if (!messages || !users_id) {
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

        const chat = await ChatGroupsModels.create({
            groups_id: groupId,
            messages: messages,
            users_id: users_id,
            created_at: dateToEpochTime(created_at),
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
            created_at: msg.created_at,
            display_name_anonymous: msg.display_name_anonymous,
            groupSlug: msg.slug,
            message: msg.messages,
        }));

        ioInstance.to(groupSlugs).emit("newMessage", formattedMessages[0]);

        console.log(`Message sent to group ${groupSlugs}: ${messages}`);
        return res
            .status(200)
            .send({ message: "Message sent", data: formattedMessages });
    } catch (error) {
        console.error("Error sending message:", error);
        return res.status(500).send("Internal server error");
    }
};
