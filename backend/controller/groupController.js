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

// Get all groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate("members")
      .populate("project")
      .populate("supervisor");

    res.status(200).json({
  count: groups.length,
  groups,
});
  } catch (error) {
    res.status(500).json({
      message: "Failed to get groups",
      error: error.message,
    });
  }
};

// Get one group by ID

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

    res.status(200).json({ group });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get group",
      error: error.message,
    });
  }
};


const getMyGroup = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: "User authentication is required.",
      });
    }

    const group = await Group.findOne({
      members: userId,
    })
      .populate("members", "fullName email role")
      .populate("project")
      .populate("supervisor", "fullName email role");

    if (!group) {
      return res.status(404).json({
        message: "No group has been assigned to this student yet.",
      });
    }

    return res.status(200).json({ group });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get your group.",
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
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel or CSV file.",
      });
    }

    filePath = req.file.path;

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        message: "The uploaded file contains no worksheet.",
      });
    }

    const rows = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { defval: "" }
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "The uploaded file is empty.",
      });
    }

    // Read and validate all spreadsheet rows first.
    const assignments = [];
    const seenEmails = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const email = String(
        row.Email || row.email || ""
      ).trim().toLowerCase();

      const groupValue =
        row.GroupNumber ?? row.groupNumber ?? row["Group Number"];

      const batch = String(
        row.Batch || row.batch || ""
      ).trim();

      const groupNumber = Number(groupValue);

      if (
        !email ||
        !batch ||
        groupValue === "" ||
        !Number.isInteger(groupNumber) ||
        groupNumber < 1
      ) {
        return res.status(400).json({
          message: `Invalid data in spreadsheet row ${i + 2}. Check Email, GroupNumber, and Batch.`,
        });
      }

      if (seenEmails.has(email)) {
        return res.status(400).json({
          message: `Duplicate email in spreadsheet: ${email}`,
        });
      }

      seenEmails.add(email);
      assignments.push({ email, groupNumber, batch });
    }

    // Match existing student accounts. Do not create accounts here.
    const emails = assignments.map((item) => item.email);

    const users = await User.find({
      email: { $in: emails },
      role: "Student",
    }).select("_id email");

    const usersByEmail = new Map(
      users.map((user) => [
        user.email.toLowerCase(),
        user,
      ])
    );

    const missingEmails = emails.filter(
      (email) => !usersByEmail.has(email)
    );

    if (missingEmails.length > 0) {
      return res.status(400).json({
        message:
          "Some spreadsheet emails do not match registered student accounts.",
        missingEmails,
      });
    }

    // Prepare assignments by group number and batch.
    const groupMap = new Map();

    for (const assignment of assignments) {
      const key = `${assignment.batch}::${assignment.groupNumber}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupNumber: assignment.groupNumber,
          batch: assignment.batch,
          members: [],
        });
      }

      groupMap.get(key).members.push(
        usersByEmail.get(assignment.email)._id
      );
    }

    // Check existing groups before making any changes.
    const plannedGroups = [...groupMap.values()];
    const batches = [...new Set(
      plannedGroups.map((group) => group.batch)
    )];

    const existingGroups = await Group.find({
      batch: { $in: batches },
    });

    const existingByKey = new Map(
      existingGroups.map((group) => [
        `${group.batch}::${group.groupNumber}`,
        group,
      ])
    );

    // Do not overwrite project-topic reference records.
    const conflicts = plannedGroups.filter((planned) => {
      const existing = existingByKey.get(
        `${planned.batch}::${planned.groupNumber}`
      );

      return existing && existing.project;
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        message:
          "Some target group numbers already have projects. No groups were changed.",
        conflicts: conflicts.map((group) => ({
          batch: group.batch,
          groupNumber: group.groupNumber,
        })),
      });
    }

    // Save the assignments while preserving project/supervisor fields.
    const savedGroups = [];

    for (const planned of plannedGroups) {
      const existing = existingByKey.get(
        `${planned.batch}::${planned.groupNumber}`
      );

      if (existing) {
        existing.members = planned.members;
        await existing.save();
        savedGroups.push(existing);
      } else {
        const created = await Group.create(planned);
        savedGroups.push(created);
      }
    }

    return res.status(200).json({
      message: "Student group assignments imported successfully.",
      groupCount: savedGroups.length,
      studentCount: assignments.length,
      groups: savedGroups,
    });
  } catch (error) {
    console.error("Group upload error:", error.message);

    return res.status(500).json({
      message: "Failed to import group assignments.",
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (error) => {
        if (error) {
          console.error("Failed to remove uploaded file:", error.message);
        }
      });
    }
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
  getGroups,
  getGroup,
  getMyGroup,
  updateGroup,
  uploadAndGenerateGroups,
  confirmGroup,
};
