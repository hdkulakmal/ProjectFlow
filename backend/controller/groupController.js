const Group = require("../model/Group");

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { groupNumber, batch, members, project, supervisor } = req.body;

    if (!groupNumber || !batch) {
      return res.status(400).json({
        message: "Group number and batch are required",
      });
    }

    const group = await Group.create({
      groupNumber,
      batch,
      members: members || [],
      project: project || null,
      supervisor: supervisor || null,
    });

    res.status(201).json({
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create group",
      error: error.message,
    });
  }
};

// Get group details
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members")
      .populate("project")
      .populate("supervisor");

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    res.status(200).json({
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get group",
      error: error.message,
    });
  }
};

// Update group details
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    res.status(200).json({
      message: "Group updated successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update group",
      error: error.message,
    });
  }
};

module.exports = {
  createGroup,
  getGroup,
  updateGroup,
};