
const express = require("express");
const router = express.Router();

const {
  saveOrUpdateGantt,
  requestTaskCompletion,
  reviewTaskCompletion,
  finalizeGanttChart,
  getGanttCharts,
} = require("../controller/ganttController");

const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

router.use(protect);

// Student creates or updates their group's task list.
router.post("/save", authorize("Student"), saveOrUpdateGantt);

// Student requests completion approval for an individual task.
router.patch(
  "/:groupId/tasks/:taskId/request-completion",
  authorize("Student"),
  requestTaskCompletion
);

// Assigned supervisor approves or rejects task completion.
router.patch(
  "/:groupId/tasks/:taskId/review",
  authorize("Supervisor"),
  reviewTaskCompletion
);

// Supervisor finalizes the whole chart.
router.patch(
  "/finalize/:groupId",
  authorize("Supervisor"),
  finalizeGanttChart
);

// Read charts, with group access checked by the controller.
router.get("/", authorize("Coordinator", "Supervisor", "Student"), getGanttCharts);
router.get("/:groupId", authorize("Coordinator", "Supervisor", "Student"), getGanttCharts);

module.exports = router;
