
const Project = require("../model/Project");

// Create a new project
const createProject = async (req, res) => {
  try {
    const { title, description, proposal, group, supervisor } = req.body;

    if (!title || !group) {
      return res.status(400).json({
        message: "Project title and group are required",
      });
    }

    const project = await Project.create({
      title,
      description,
      proposal,
      group,
      supervisor: supervisor || null,
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create project",
      error: error.message,
    });
  }
};

// Get all projects
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("group")
      .populate("supervisor");

    res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get projects",
      error: error.message,
    });
  }
};

// Get one project by ID
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("group")
      .populate("supervisor");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get project",
      error: error.message,
    });
  }
};

// Update project details
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update project",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
};