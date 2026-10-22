const { authenticateToken } = require("../middleware/chatAuth");
const {
  CHAT_ROLES,
  ChatError,
  idOf,
  normalizeRole,
} = require("../utils/chatAccess");
const {
  loadChannelContext,
  sendMessage,
  broadcastMessage,
  editMessage,
  deleteMessage,
  broadcastMessageUpdate,
  broadcastMessageDelete,
} = require("../utils/chatService");

const makeReply = (ack) => (payload) => {
  if (typeof ack === "function") ack(payload);
};

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers?.authorization || "";
      const token =
        socket.handshake.auth?.token ||
        (header.startsWith("Bearer ") ? header.slice(7) : null);

      const user = await authenticateToken(token);
      if (!CHAT_ROLES.includes(normalizeRole(user))) {
        throw new ChatError(403, "Your role cannot use communication");
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error(error.message || "Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      "User connected:",
      socket.id,
      `(${normalizeRole(socket.user)})`,
    );

    socket.join(`user_${idOf(socket.user)}`);

    socket.on("join_channel", async (channelId, ack) => {
      const reply = makeReply(ack);
      try {
        const { channel } = await loadChannelContext(socket.user, channelId);
        socket.join(channel.id);
        reply({ ok: true, channel: channel.id });
      } catch (error) {
        reply({ ok: false, message: error.message });
      }
    });

    socket.on("leave_channel", (channelId) => {
      socket.leave(String(channelId));
    });

    socket.on("send_message", async (data, ack) => {
      const reply = makeReply(ack);
      try {
        const { channel, message, mentions, attachments, replyTo } = data || {};
        const saved = await sendMessage({
          user: socket.user,
          channelId: channel,
          text: message,
          mentionIds: mentions,
          attachments,
          replyTo,
        });
        broadcastMessage(io, saved);
        reply({ ok: true, data: saved });
      } catch (error) {
        const text =
          error instanceof ChatError ? error.message : "Failed to send message";
        if (!(error instanceof ChatError))
          console.error("Message error:", error);
        reply({ ok: false, message: text });
        socket.emit("message_error", { message: text });
      }
    });

    socket.on("edit_message", async (data, ack) => {
      const reply = makeReply(ack);
      try {
        const { messageId, message } = data || {};
        const updated = await editMessage({
          user: socket.user,
          messageId,
          text: message,
        });
        broadcastMessageUpdate(io, updated);
        reply({ ok: true, data: updated });
      } catch (error) {
        const text =
          error instanceof ChatError ? error.message : "Failed to edit message";
        reply({ ok: false, message: text });
      }
    });

    socket.on("delete_message", async (data, ack) => {
      const reply = makeReply(ack);
      try {
        const { messageId } = data || {};
        const removed = await deleteMessage({
          user: socket.user,
          messageId,
        });
        broadcastMessageDelete(io, removed);
        reply({ ok: true, data: { _id: removed._id, deleted: true } });
      } catch (error) {
        const text =
          error instanceof ChatError
            ? error.message
            : "Failed to delete message";
        reply({ ok: false, message: text });
      }
    });

    socket.on("typing_start", (data) => {
      const channel = data?.channel;
      if (!channel) return;
      socket.to(channel).emit("user_typing", {
        channel,
        userId: idOf(socket.user),
        name: socket.user.full_name || socket.user.username || "User",
      });
    });

    socket.on("typing_stop", (data) => {
      const channel = data?.channel;
      if (!channel) return;
      socket.to(channel).emit("user_stop_typing", {
        channel,
        userId: idOf(socket.user),
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
