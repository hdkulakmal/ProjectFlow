const express = require("express");
const router = express.Router();
const {
  createRequest,
  getSupervisorRequests,
  handleRequest,
} = require("../controller/supervisorRequestController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.post("/", protect, authorize("Student"), createRequest);
router.get("/", protect, authorize("Supervisor"), getSupervisorRequests);
router.put("/:requestId", protect, authorize("Supervisor"), handleRequest);

module.exports = router;