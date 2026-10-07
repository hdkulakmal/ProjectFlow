const Message = require("../model/Message");
const {
  ChatError,
  CHANNEL_TYPES,
  idOf,
  parseChannelId,
  getChannelAccess,
} = require("./chatAccess");
const {
  USER_FIELDS,
  findUserById,
  findUsersByIds,
  findCoordinators,
  findGroupById,
} = require("./groupAdapter");

const MAX_MESSAGE_LENGTH = 2000;

const populateMessage = (doc) =>
  doc.populate([
    { path: "sender", select: USER_FIELDS },
    { path: "receiver", select: USER_FIELDS },
    { path: "mentions", select: USER_FIELDS },
  ]);

const loadChannelContext = async (user, rawChannelId) => {
  const channel = parseChannelId(rawChannelId);
  const ctx = {};

  if (channel.type === CHANNEL_TYPES.PRIVATE) {
    const me = idOf(user);
    if (channel.userIds.includes(me)) {
      ctx.peer = await findUserById(channel.userIds.find((id) => id !== me));
    }
  } else {
    ctx.group = await findGroupById(channel.groupId);
  }

  const access = getChannelAccess(user, channel, ctx);
  if (!access.allowed) throw new ChatError(access.status, access.reason);
  return { channel, ...ctx };
};

const sendMessage = async ({
  user,
  channelId,
  text,
  mentionIds = [],
  attachments = [],
}) => {
  const body = String(text ?? "").trim();
  const files = Array.isArray(attachments) ? attachments : [];

  if (!body && files.length === 0) {
    throw new ChatError(400, "Message or file required");
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(
      400,
      `Message is longer than ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  const { channel, group, peer } = await loadChannelContext(user, channelId);
  const me = idOf(user);

  let mentions = [];
  if (channel.type !== CHANNEL_TYPES.PRIVATE) {
    const wanted = [...new Set((mentionIds || []).map(String))].filter(
      (id) => /^[a-fA-F0-9]{24}$/.test(id) && id !== me,
    );
    const candidates = wanted.length ? await findUsersByIds(wanted) : [];
    mentions = candidates
      .filter((u) => getChannelAccess(u, channel, { group }).allowed)
      .map((u) => u._id);
  }

  const created = await Message.create({
    sender: user._id,
    channel: channel.id,
    channelType: channel.type,
    group: group ? group._id : null,
    receiver: peer ? peer._id : null,
    message: body || (files.length ? "📎 File" : ""),
    mentions,
    attachments: files,
  });

  return populateMessage(created);
};

const getMessages = async ({ user, channelId, before, limit = 50 }) => {
  const { channel } = await loadChannelContext(user, channelId);

  const filter = { channel: channel.id };
  const beforeDate = before ? new Date(before) : null;
  if (beforeDate && !isNaN(beforeDate)) filter.createdAt = { $lt: beforeDate };

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .populate("sender", USER_FIELDS)
    .populate("receiver", USER_FIELDS)
    .populate("mentions", USER_FIELDS);

  return messages.reverse();
};

const getParticipants = async ({ user, channelId }) => {
  const { channel, group, peer } = await loadChannelContext(user, channelId);

  if (channel.type === CHANNEL_TYPES.PRIVATE) return [user, peer];

  const ids = (group.members || []).map(idOf);
  if (group.supervisor) ids.push(idOf(group.supervisor));

  let people = await findUsersByIds(ids);
  if (channel.type === CHANNEL_TYPES.TRIAD) {
    people = people.concat(await findCoordinators());
  }
  return people.filter((u) => getChannelAccess(u, channel, { group }).allowed);
};

const editMessage = async ({ user, messageId, text }) => {
  const body = String(text ?? "").trim();
  if (!body) throw new ChatError(400, "Message cannot be empty");
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(
      400,
      `Message is longer than ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  const msg = await Message.findById(messageId);
  if (!msg || msg.deleted) throw new ChatError(404, "Message not found");
  if (String(msg.sender) !== idOf(user)) {
    throw new ChatError(403, "You can only edit your own messages");
  }

  await loadChannelContext(user, msg.channel);

  msg.message = body;
  msg.edited = true;
  msg.editedAt = new Date();
  await msg.save();

  return populateMessage(msg);
};

const deleteMessage = async ({ user, messageId }) => {
  const msg = await Message.findById(messageId);
  if (!msg || msg.deleted) throw new ChatError(404, "Message not found");
  if (String(msg.sender) !== idOf(user)) {
    throw new ChatError(403, "You can only delete your own messages");
  }

  await loadChannelContext(user, msg.channel);

  msg.deleted = true;
  msg.message = "";
  msg.attachments = [];
  await msg.save();

  return populateMessage(msg);
};

const broadcastMessage = (io, message) => {
  if (!io) return;

  if (message.channelType === CHANNEL_TYPES.PRIVATE) {
    io.to(`user_${idOf(message.sender)}`)
      .to(`user_${idOf(message.receiver)}`)
      .emit("receive_message", message);
  } else {
    io.to(message.channel).emit("receive_message", message);
  }

  (message.mentions || []).forEach((mentioned) => {
    io.to(`user_${idOf(mentioned)}`).emit("mentioned", {
      messageId: message._id,
      channel: message.channel,
      by: message.sender,
    });
  });
};

const broadcastMessageUpdate = (io, message) => {
  if (!io || !message) return;
  if (message.channelType === CHANNEL_TYPES.PRIVATE) {
    io.to(`user_${idOf(message.sender)}`)
      .to(`user_${idOf(message.receiver)}`)
      .emit("message_updated", message);
  } else {
    io.to(message.channel).emit("message_updated", message);
  }
};

const broadcastMessageDelete = (io, message) => {
  if (!io || !message) return;
  const payload = {
    _id: message._id,
    channel: message.channel,
    deleted: true,
  };
  if (message.channelType === CHANNEL_TYPES.PRIVATE) {
    io.to(`user_${idOf(message.sender)}`)
      .to(`user_${idOf(message.receiver)}`)
      .emit("message_deleted", payload);
  } else {
    io.to(message.channel).emit("message_deleted", payload);
  }
};

module.exports = {
  loadChannelContext,
  sendMessage,
  getMessages,
  getParticipants,
  broadcastMessage,
  editMessage,
  deleteMessage,
  broadcastMessageUpdate,
  broadcastMessageDelete,
};
