const express = require("express");

const {
  createProject,
  getProject,
  updateProject,
} = require("../controller/projectController");

const router = express.Router();

// Create a project
router.post("/", createProject);

// Get project details
router.get("/:id", getProject);

// Update project details
router.put("/:id", updateProject);

module.exports = router;