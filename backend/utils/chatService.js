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

const sendMessage = async ({ user, channelId, text, mentionIds = [] }) => {
  const body = String(text ?? "").trim();

  if (!body) {
    throw new ChatError(400, "Message is required");
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
    message: body,
    mentions,
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

module.exports = {
  loadChannelContext,
  sendMessage,
  getMessages,
  getParticipants,
  broadcastMessage,
};
