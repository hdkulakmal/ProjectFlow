const express = require("express");

const {
  createMessage,
  getGroupMessages,
} = require("../controller/messageController");

const router = express.Router();

// Create a new message
router.post("/", createMessage);

// Get messages for a group
router.get("/:groupId", getGroupMessages);

module.exports = router;
