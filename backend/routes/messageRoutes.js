const express = require("express");

const {
  createMessage,
  getChannelMessages,
  searchChannelMessages,
  updateMessage,
  removeMessage,
} = require("../controller/messageController");
const { protect, allowChatRoles } = require("../middleware/chatAuth");

const router = express.Router();

router.use(protect, allowChatRoles);

router.post("/", createMessage);
router.get("/search", searchChannelMessages);
router.get("/:channelId", getChannelMessages);
router.patch("/:id", updateMessage);
router.delete("/:id", removeMessage);

module.exports = router;
