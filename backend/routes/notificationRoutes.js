const express = require("express");
const {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} = require("../controller/notificationController");
const { protect } = require("../middleware/chatAuth");

const router = express.Router();
router.use(protect);

router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;
