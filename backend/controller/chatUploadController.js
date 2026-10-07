const { ChatError } = require("../utils/chatAccess");
const {
  sendMessage,
  getMessages,
  broadcastMessage,
  editMessage,
  deleteMessage,
  broadcastMessageUpdate,
  broadcastMessageDelete,
} = require("../utils/chatService");

const handleError = (res, error, fallback) => {
  if (error instanceof ChatError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(fallback, error);
  res.status(500).json({ message: fallback });
};

// POST /api/messages   body: { channel, message?, mentions?, attachments? }
const createMessage = async (req, res) => {
  try {
    const { channel, message, mentions, attachments } = req.body;
    if (!channel) {
      return res.status(400).json({ message: "channel is required" });
    }
    if (!message && !(attachments && attachments.length)) {
      return res
        .status(400)
        .json({ message: "message or attachments required" });
    }

    const saved = await sendMessage({
      user: req.user,
      channelId: channel,
      text: message,
      mentionIds: mentions,
      attachments,
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

// PATCH /api/messages/:id   body: { message }
const updateMessage = async (req, res) => {
  try {
    const updated = await editMessage({
      user: req.user,
      messageId: req.params.id,
      text: req.body.message,
    });
    broadcastMessageUpdate(req.app.get("io"), updated);
    res.json({ message: "Message updated", data: updated });
  } catch (error) {
    handleError(res, error, "Failed to update message");
  }
};

// DELETE /api/messages/:id
const removeMessage = async (req, res) => {
  try {
    const removed = await deleteMessage({
      user: req.user,
      messageId: req.params.id,
    });
    broadcastMessageDelete(req.app.get("io"), removed);
    res.json({
      message: "Message deleted",
      data: { _id: removed._id, channel: removed.channel, deleted: true },
    });
  } catch (error) {
    handleError(res, error, "Failed to delete message");
  }
};

module.exports = {
  createMessage,
  getChannelMessages,
  updateMessage,
  removeMessage,
  handleError,
};
