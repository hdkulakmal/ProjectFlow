const express = require("express");

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
} = require("../controller/projectController");

const router = express.Router();

// Create a project
router.post("/", createProject);

// Get all projects
router.get("/", getProjects);

// Get project details
router.get("/:id", getProject);

// Update project details
router.put("/:id", updateProject);

module.exports = router;