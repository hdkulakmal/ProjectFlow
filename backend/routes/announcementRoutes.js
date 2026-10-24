const express = require("express");
const {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controller/announcementController");
const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();
router.use(protect);

router.get("/", listAnnouncements);
router.get("/:id", getAnnouncement);
router.post("/", authorize("Coordinator"), createAnnouncement);
router.put("/:id", authorize("Coordinator"), updateAnnouncement);
router.delete("/:id", authorize("Coordinator"), deleteAnnouncement);

module.exports = router;
