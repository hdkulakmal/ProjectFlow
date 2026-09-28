const Group = require("../model/Group");
const Supervisor = require("../model/Supervisor");
const SupervisorRequest = require("../model/SupervisorRequest");

// @desc    Send a supervisor request from student group
// @route   POST /api/supervisor-requests
// @access  Private (Student)
const createRequest = async (req, res) => {
  try {
    const { supervisorId, groupId, ideaBrief } = req.body;

    const existingRequest = await SupervisorRequest.findOne({ group: groupId, status: "Pending" });
    if (existingRequest) {
      return res.status(400).json({ message: "Your group already has a pending request." });
    }

    const profile = await Supervisor.findOne({ user: supervisorId });
    const capacity = profile ? profile.capacity : 5;
    const currentAssigned = await Group.countDocuments({ supervisor: supervisorId });

    if (currentAssigned >= capacity) {
      return res.status(400).json({ message: "Supervisor slots are full." });
    }

    const request = await SupervisorRequest.create({
      group: groupId,
      supervisor: supervisorId,
      ideaBrief: ideaBrief || "",
      status: "Pending",
    });

    res.status(201).json({ message: "Request sent successfully.", request });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get pending requests for the logged-in supervisor
// @route   GET /api/supervisor-requests
// @access  Private (Supervisor)
const getSupervisorRequests = async (req, res) => {
  try {
    const requests = await SupervisorRequest.find({
      supervisor: req.user._id,
      status: "Pending",
    }).populate("group");

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Accept or Reject group request (Establishes Supervisor-Group Relationship)
// @route   PUT /api/supervisor-requests/:requestId
// @access  Private (Supervisor)
const handleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // Expected: "Accepted" or "Rejected"

    const request = await SupervisorRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    if (status === "Accepted") {
      const profile = await Supervisor.findOne({ user: req.user._id });
      const capacity = profile ? profile.capacity : 5;
      const currentAssigned = await Group.countDocuments({ supervisor: req.user._id });

      if (currentAssigned >= capacity) {
        return res.status(400).json({ message: "Capacity full. Cannot accept more groups." });
      }

      request.status = "Accepted";
      await request.save();

      // Establish Supervisor-Group Relationship
      await Group.findByIdAndUpdate(request.group, { supervisor: req.user._id });

      return res.status(200).json({ message: "Request accepted successfully.", request });
    } else if (status === "Rejected") {
      request.status = "Rejected";
      await request.save();
      return res.status(200).json({ message: "Request rejected.", request });
    }

    res.status(400).json({ message: "Invalid status status provided." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createRequest,
  getSupervisorRequests,
  handleRequest,
};