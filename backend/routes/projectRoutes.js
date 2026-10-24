
const express = require("express");

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
} = require("../controller/projectController");

const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Only coordinators can create projects
router.post("/", protect, authorize("Coordinator"), createProject);

// Authenticated users can view projects
router.get("/", protect, getProjects);
router.get("/:id", protect, getProject);

// Only coordinators can update projects
router.put("/:id", protect, authorize("Coordinator"), updateProject);

module.exports = router;
