const { ChatError } = require("../utils/chatAccess");
const {
  sendMessage,
  getMessages,
  broadcastMessage,
} = require("../utils/chatService");

const handleError = (res, error, fallback) => {
  if (error instanceof ChatError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(fallback, error);
  res.status(500).json({ message: fallback });
};

// POST /api/messages   body: { channel, message, mentions? }
const createMessage = async (req, res) => {
  try {
    const { channel, message, mentions } = req.body;
    if (!channel) {
      return res.status(400).json({ message: "channel is required" });
    }
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const saved = await sendMessage({
      user: req.user,
      channelId: channel,
      text: message,
      mentionIds: mentions,
    });

    broadcastMessage(req.app.get("io"), saved);
    res
      .status(201)
      .json({ message: "Message created successfully", data: saved });
  } catch (error) {
    handleError(res, error, "Failed to create message");
  }
};

// GET /api/messages/:channelId?before=&limit=
const getChannelMessages = async (req, res) => {
  try {
    const data = await getMessages({
      user: req.user,
      channelId: req.params.channelId,
      before: req.query.before,
      limit: req.query.limit,
    });
    res.status(200).json({ data });
  } catch (error) {
    handleError(res, error, "Failed to get messages");
  }
};

module.exports = {
  createMessage,
  getChannelMessages,
  handleError,
};
