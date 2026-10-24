const express = require("express");
const {
  createMeeting,
  listMeetings,
  getMeeting,
  respondToMeeting,
  cancelMeeting,
  completeMeeting,
} = require("../controller/meetingController");
const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();
router.use(protect);

router.post("/", authorize("Student", "Supervisor"), createMeeting);
router.get("/", listMeetings);
router.get("/:id", getMeeting);
router.patch("/:id/respond", authorize("Supervisor"), respondToMeeting);
router.patch("/:id/cancel", authorize("Student", "Supervisor"), cancelMeeting);
router.patch("/:id/complete", authorize("Supervisor"), completeMeeting);

module.exports = router;
