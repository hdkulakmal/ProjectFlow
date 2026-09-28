const express = require("express");
const router = express.Router();
const {
  getAllSupervisors,
  updateSupervisorCapacity,
  setDefaultCapacity,
  getMyGroups,
} = require("../controller/supervisorController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.get("/", protect, getAllSupervisors);
router.get("/my-groups", protect, authorize("Supervisor"), getMyGroups);

router.put("/capacity/default", protect, authorize("Coordinator"), setDefaultCapacity);
router.put("/:id/capacity", protect, authorize("Coordinator"), updateSupervisorCapacity);

module.exports = router;