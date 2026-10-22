const express = require("express");

const {
  listChannels,
  searchUsers,
  openPrivate,
  listParticipants,
} = require("../controller/channelController");
const { protect, allowChatRoles } = require("../middleware/chatAuth");

const router = express.Router();

router.use(protect, allowChatRoles);

router.get("/", listChannels);
router.get("/users", searchUsers);
router.post("/private", openPrivate);
router.get("/:channelId/participants", listParticipants);

module.exports = router;
