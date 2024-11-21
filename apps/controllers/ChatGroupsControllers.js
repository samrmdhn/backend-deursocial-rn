import ChatGroupsModels from "../models/ChatGroupsModels.js";

let ioInstance; // Variabel untuk menyimpan instance Socket.IO

// Fungsi untuk menginisialisasi Socket.IO
export const initializeSocket = (io) => {
    ioInstance = io;

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Handle user join group
        socket.on('joinGroup', (groupId) => {
            socket.join(groupId);
            console.log(`User joined group: ${groupId}`);
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

// Fungsi untuk mengirim pesan ke grup
export const sendMessageToGroup = async(req, res) => {
    const { groups_id, message, users_id } = req.body;
    console.log({ groups_id, message, users_id })
    if (!ioInstance) {
        return res.status(500).send('Socket.IO is not initialized');
    }
    const chat = await ChatGroupsModels.create({
        groups_id: groups_id,
        messages: message,
        users_id: users_id
    })
    console.log({ groupId: chat.groups_id, message: chat.messages });
    // Emit pesan ke grup tertentu
    ioInstance.to(groups_id).emit('newMessage', { groupId: chat.groups_id, message: chat.messages });
    console.log(`Message sent to group ${groups_id}: ${message}`);

    return res.status(200).send('Message sent');
};

