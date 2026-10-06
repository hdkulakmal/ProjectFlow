const Message = require("../model/Message");
const {
  ChatError,
  ROLES,
  CHANNEL_TYPES,
  normalizeRole,
  idOf,
  canChat,
  assignedSupervisorId,
  groupChannelId,
  privateChannelId,
} = require("../utils/chatAccess");
const {
  USER_FIELDS,
  findUserById,
  searchChatUsers,
  findGroupForStudent,
  findGroupsForSupervisor,
  findGroupsWithSupervisor,
  groupLabel,
} = require("../utils/groupAdapter");
const { getParticipants } = require("../utils/chatService");
const { handleError } = require("./messageController");

const TITLES = {
  [CHANNEL_TYPES.GROUP]: "Students",
  [CHANNEL_TYPES.SUPERVISOR]: "Supervisor",
  [CHANNEL_TYPES.TRIAD]: "Supervisor & Coordinator",
};
const LOCKED_REASON = "Opens after the supervisor accepts the group's request";

const describeGroupChannel = (type, group) => {
  const enabled =
    type === CHANNEL_TYPES.GROUP ? true : assignedSupervisorId(group) !== null;
  return {
    id: groupChannelId(type, group._id),
    type,
    groupId: String(group._id),
    title: `${groupLabel(group)} - ${TITLES[type]}`,
    enabled,
    ...(enabled ? {} : { reason: LOCKED_REASON }),
  };
};

// GET /api/channels  -> everything this user can see in the sidebar
const listChannels = async (req, res) => {
  try {
    const me = idOf(req.user);
    const role = normalizeRole(req.user);
    const channels = [];

    if (role === ROLES.STUDENT) {
      const group = await findGroupForStudent(req.user._id);
      if (group) {
        channels.push(describeGroupChannel(CHANNEL_TYPES.GROUP, group));
        channels.push(describeGroupChannel(CHANNEL_TYPES.SUPERVISOR, group));
        channels.push(describeGroupChannel(CHANNEL_TYPES.TRIAD, group));
      }
    } else if (role === ROLES.SUPERVISOR) {
      for (const group of await findGroupsForSupervisor(req.user._id)) {
        channels.push(describeGroupChannel(CHANNEL_TYPES.SUPERVISOR, group));
        channels.push(describeGroupChannel(CHANNEL_TYPES.TRIAD, group));
      }
    } else if (role === ROLES.COORDINATOR) {
      for (const group of await findGroupsWithSupervisor()) {
        channels.push(describeGroupChannel(CHANNEL_TYPES.TRIAD, group));
      }
    }

    // Private chats this user already has, most recent first
    const recent = await Message.find({
      channelType: CHANNEL_TYPES.PRIVATE,
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(300)
      .populate("sender", USER_FIELDS)
      .populate("receiver", USER_FIELDS);

    const seen = new Set();
    for (const msg of recent) {
      if (seen.has(msg.channel)) continue;
      seen.add(msg.channel);
      const peer = idOf(msg.sender) === me ? msg.receiver : msg.sender;
      if (!peer) continue;
      channels.push({
        id: msg.channel,
        type: CHANNEL_TYPES.PRIVATE,
        title: peer.fullName || peer.email,
        enabled: true,
        peer,
        lastMessage: { text: msg.message, createdAt: msg.createdAt },
      });
    }

    res.status(200).json({ data: channels });
  } catch (error) {
    handleError(res, error, "Failed to load channels");
  }
};

// GET /api/channels/users?search=ann  -> people I can start a private chat with
const searchUsers = async (req, res) => {
  try {
    const data = await searchChatUsers(req.user._id, req.query.search);
    res.status(200).json({ data });
  } catch (error) {
    handleError(res, error, "Failed to search users");
  }
};

// POST /api/channels/private   body: { userId }  -> the private channel with that user
const openPrivate = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const id = privateChannelId(idOf(req.user), userId); // validates + sorts ids
    const peer = await findUserById(userId);
    if (!canChat(peer))
      throw new ChatError(404, "That user is not available for chat");

    res.status(200).json({
      data: {
        id,
        type: CHANNEL_TYPES.PRIVATE,
        title: peer.fullName || peer.email,
        enabled: true,
        peer,
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to open private chat");
  }
};

// GET /api/channels/:channelId/participants  -> for the @mention picker
const listParticipants = async (req, res) => {
  try {
    const people = await getParticipants({
      user: req.user,
      channelId: req.params.channelId,
    });
    res.status(200).json({
      data: people.map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    handleError(res, error, "Failed to load participants");
  }
};

module.exports = { listChannels, searchUsers, openPrivate, listParticipants };
