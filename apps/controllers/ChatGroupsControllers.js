import ChatGroupsModels from "../models/ChatGroupsModels.js";

let ioInstance;

export const initializeSocket = (io) => {
    ioInstance = io
    io.on('connection', (socket) => {
        socket.on('joinGroup', async (groupId) => {
            const id = Number(groupId);
            if (!id) return;

            socket.join(id);

            try {
                const messages = await ChatGroupsModels.findAll({
                    where: { groups_id: id },
                    order: [['id', 'DESC']],
                    limit: 20, // Ambil 20 pesan terakhir
                });

                const formattedMessages = messages.map((msg) => ({
                    groupId: msg.groups_id,
                    message: msg.messages,
                }));

                socket.emit('initialMessages', formattedMessages);
            } catch (error) {
                console.error('Error fetching initial messages:', error);
            }
        });

        socket.on('fetchMoreMessages', async ({ groupId, offset }) => {
            const id = Number(groupId);
            if (!id) return;

            try {
                const messages = await ChatGroupsModels.findAll({
                    where: { groups_id: id },
                    order: [['id', 'DESC']],
                    limit: 20,
                    offset: offset || 0,
                });

                const formattedMessages = messages.map((msg) => ({
                    groupId: msg.groups_id,
                    message: msg.messages,
                }));

                socket.emit('moreMessages', formattedMessages);
            } catch (error) {
                console.error('Error fetching more messages:', error);
            }
        });
    });
};

export const sendMessageToGroup = async (req, res) => {
    const { groups_id, message, users_id } = req.body;

    if (!groups_id || !message || !users_id) {
        return res.status(400).send('Invalid request payload');
    }

    if (!ioInstance) {
        return res.status(500).send('Socket.IO is not initialized');
    }

    try {
        const chat = await ChatGroupsModels.create({
            groups_id: groups_id,
            messages: message,
            users_id: users_id,
        });

        ioInstance.to(groups_id).emit('newMessage', {
            groupId: chat.groups_id,
            message: chat.messages,
        });

        console.log(`Message sent to group ${groups_id}: ${message}`);
        return res.status(200).send('Message sent');
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).send('Internal server error');
    }
};
