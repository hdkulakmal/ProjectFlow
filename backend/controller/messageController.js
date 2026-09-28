const Message = require("../model/Message");

// Create a new message
const createMessage = async (req, res) => {
  try {
    const { sender, group, message, mentions = [] } = req.body;

    if (!sender || !group || !message) {
      return res.status(400).json({
        message: "sender, group and message are required",
      });
    }

    const newMessage = await Message.create({
      sender,
      group,
      message,
      mentions,
    });

    res.status(201).json({
      message: "Message created successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Create message error:", error);

    res.status(500).json({
      message: "Failed to create message",
    });
  }
};

// Get messages for a group
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({
      group: groupId,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username full_name email")
      .populate("mentions", "username full_name email");

    res.status(200).json({
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    res.status(500).json({
      message: "Failed to get messages",
    });
  }
};

module.exports = {
  createMessage,
  getGroupMessages,
};
