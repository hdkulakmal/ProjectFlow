const Message = require("../model/Message");

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_group", (groupId) => {
      socket.join(`group_${groupId}`);
      console.log(`Socket ${socket.id} joined group_${groupId}`);
    });

    socket.on("send_message", async (data) => {
      try {
        const { sender, group, message, mentions = [] } = data;

        const newMessage = await Message.create({
          sender,
          group,
          message,
          mentions,
        });

        io.to(`group_${group}`).emit("receive_message", newMessage);
      } catch (error) {
        console.error("Message error:", error);

        socket.emit("message_error", {
          message: "Failed to send message",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
