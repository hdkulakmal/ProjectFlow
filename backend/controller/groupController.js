const xlsx = require("xlsx");
const fs = require("fs");
const User = require("../model/User");
const Group = require("../model/Group");

// ==========================================
// Existing Team Controller Functions
// ==========================================

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

// ==========================================
// Coordinator Functions
// ==========================================

// Upload Excel & Auto-Generate Draft Groups
const uploadAndGenerateGroups = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file." });
    }

    const { groupSize = 5, batch = "2024" } = req.body;
    const parsedGroupSize = parseInt(groupSize, 10);

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rawStudents = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    if (!rawStudents || rawStudents.length === 0) {
      return res.status(400).json({ message: "Uploaded Excel file is empty." });
    }

    const studentIds = [];
    for (const studentData of rawStudents) {
      const name = studentData.Name || studentData.name;
      const email = studentData.Email || studentData.email;
      const regNo = studentData.RegNo || studentData.regNo || studentData["Registration No"];

      if (!email || !name) continue;

      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          name,
          email,
          regNo: regNo || "",
          role: "Student",
        });
      }
      studentIds.push(user._id);
    }

    const generatedGroups = [];
    let groupIndex = 1;

    for (let i = 0; i < studentIds.length; i += parsedGroupSize) {
      const chunk = studentIds.slice(i, i + parsedGroupSize);
      const newGroup = await Group.create({
        groupNumber: `Group ${groupIndex++}`,
        batch,
        members: chunk,
        isConfirmed: false,
        status: "Draft",
      });
      generatedGroups.push(newGroup);
    }

    res.status(201).json({
      message: `Generated ${generatedGroups.length} draft groups.`,
      groups: generatedGroups,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to process Excel file",
      error: error.message,
    });
  }
};

// Confirm or Edit Draft Group
const confirmGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members, groupNumber } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (members) group.members = members;
    if (groupNumber) group.groupNumber = groupNumber;
    group.isConfirmed = true;
    group.status = "Pending";

    await group.save();

    res.status(200).json({
      message: "Group confirmed successfully.",
      group,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to confirm group",
      error: error.message,
    });
  }
};

// Export all functions together
module.exports = {
  createGroup,
  getGroup,
  updateGroup,
  uploadAndGenerateGroups,
  confirmGroup,
};