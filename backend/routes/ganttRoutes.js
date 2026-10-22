const express = require("express");
const router = express.Router();

const {
  saveOrUpdateGantt,
  finalizeGanttChart,
  getGanttCharts,
} = require("../controller/ganttController");

const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

// Student routes
router.post(
  "/save",
  protect,
  authorize("Student"),
  saveOrUpdateGantt
);

// Supervisor routes
router.patch(
  "/finalize/:groupId",
  protect,
  authorize("Supervisor"),
  finalizeGanttChart
);

// Coordinator & General viewing routes
// Get all accessible Gantt charts
router.get(
  "/",
  protect,
  authorize("Coordinator", "Supervisor", "Student"),
  getGanttCharts
);

// Get Gantt chart by group ID
router.get(
  "/:groupId",
  protect,
  authorize("Coordinator", "Supervisor", "Student"),
  getGanttCharts
);
    
module.exports = router;