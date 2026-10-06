const express = require("express");

const {
  createMessage,
  getChannelMessages,
} = require("../controller/messageController");
const { protect, allowChatRoles } = require("../middleware/chatAuth");

const router = express.Router();

// 1) logged in   2) role is student / supervisor / coordinator
// (channel-level access is then checked inside the service)
router.use(protect, allowChatRoles);

// Create a new message
router.post("/", createMessage);

// Get messages for a channel
router.get("/:channelId", getChannelMessages);

module.exports = router;
