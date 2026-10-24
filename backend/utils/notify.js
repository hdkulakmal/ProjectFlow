// Creates private notifications and pushes them in real time over Socket.IO
// (each connected user is in the room `user_<id>`, see socket/socket.js).
// A notification failure must never break the action that triggered it,
// so errors are logged and swallowed.
const Notification = require("../model/Notification");

let io = null;
const setIo = (instance) => {
  io = instance;
};

const notifyUsers = async (userIds, { type = "general", title, message = "", refModel = null, refId = null, announcement = null }) => {
  const unique = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!unique.length) return [];

  const docs = unique.map((recipient) => ({
    recipient,
    type,
    title,
    message,
    refModel,
    refId,
    announcement,
  }));

  try {
    // ordered:false keeps going past duplicates (same announcement twice).
    const created = await Notification.insertMany(docs, { ordered: false });
    if (io) {
      for (const n of created) io.to(`user_${n.recipient}`).emit("notification", n);
    }
    return created;
  } catch (error) {
    if (error.code === 11000 || error.writeErrors) {
      return error.insertedDocs || [];
    }
    console.error("Failed to create notifications:", error.message);
    return [];
  }
};

module.exports = { notifyUsers, setIo };
