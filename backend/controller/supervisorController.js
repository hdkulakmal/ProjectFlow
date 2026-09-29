const User = require("../model/User");
const Group = require("../model/Group");
const Supervisor = require("../model/Supervisor");

// @desc    Get all supervisors with available slot counts (e.g., Slot available 4/5)
// @route   GET /api/supervisors
// @access  Private
const getAllSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "Supervisor" }).select("-password");

    const result = await Promise.all(
      supervisors.map(async (sup) => {
        let profile = await Supervisor.findOne({ user: sup._id });
        if (!profile) {
          profile = await Supervisor.create({ user: sup._id, capacity: 5 });
        }

        const assignedCount = await Group.countDocuments({ supervisor: sup._id });
        return {
          _id: sup._id,
          name: sup.name,
          email: sup.email,
          capacity: profile.capacity,
          assignedGroupsCount: assignedCount,
          slotsAvailable: Math.max(0, profile.capacity - assignedCount),
          isFull: assignedCount >= profile.capacity,
        };
      })
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update capacity for an individual supervisor
// @route   PUT /api/supervisors/:id/capacity
// @access  Private (Coordinator)
const updateSupervisorCapacity = async (req, res) => {
  try {
    const { capacity } = req.body;
    const { id } = req.params;

    let supervisorProfile = await Supervisor.findOne({ user: id });
    if (!supervisorProfile) {
      supervisorProfile = new Supervisor({ user: id, capacity });
    } else {
      supervisorProfile.capacity = capacity;
    }

    await supervisorProfile.save();
    res.status(200).json({ message: "Supervisor capacity updated successfully.", supervisorProfile });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Set default capacity slot count for ALL supervisors
// @route   PUT /api/supervisors/capacity/default
// @access  Private (Coordinator)
const setDefaultCapacity = async (req, res) => {
  try {
    const { defaultSlots } = req.body;
    if (defaultSlots === undefined || defaultSlots < 0) {
      return res.status(400).json({ message: "Provide a valid slot count." });
    }

    const supervisors = await User.find({ role: "Supervisor" });
    for (const sup of supervisors) {
      await Supervisor.findOneAndUpdate(
        { user: sup._id },
        { capacity: defaultSlots },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: `Default capacity updated to ${defaultSlots} slots.` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get accepted groups assigned to logged-in supervisor
// @route   GET /api/supervisors/my-groups
// @access  Private (Supervisor)
const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ supervisor: req.user._id })
      .populate("members", "name email regNo")
      .populate("projectIdea");

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllSupervisors,
  updateSupervisorCapacity,
  setDefaultCapacity,
  getMyGroups,
};