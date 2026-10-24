
const mongoose = require("mongoose");
const GanttChart = require("../model/GanttChart");
const Group = require("../model/Group");

const getRole = (user) => {
  const value = user?.role?.role_name ?? user?.role ?? "";
  const role = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");

  return role === "project_coordinator" ? "coordinator" : role;
};

const getUserId = (user) => String(user?._id ?? user?.id ?? "");

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id ?? ""));

const fail = (res, status, message) =>
  res.status(status).json({ message });

const getGroupForUser = async (groupId, user) => {
  if (!isValidId(groupId)) {
    return { error: [400, "Invalid group ID"] };
  }

  const group = await Group.findById(groupId);

  if (!group) {
    return { error: [404, "Group not found"] };
  }

  const role = getRole(user);
  const userId = getUserId(user);

  if (role === "student") {
    const isMember = (group.members || []).some(
      (member) => String(member?._id ?? member) === userId
    );

    if (!isMember) {
      return {
        error: [403, "You are not a member of this group"],
      };
    }
  } else if (role === "supervisor") {
    if (String(group.supervisor?._id ?? group.supervisor ?? "") !== userId) {
      return {
        error: [403, "You are not assigned to this group"],
      };
    }
  } else if (role !== "coordinator") {
    return { error: [403, "Access denied"] };
  }

  return { group };
};

// Student: create or update the task list for their own group.
const saveOrUpdateGantt = async (req, res) => {
  try {
    const { groupId, tasks } = req.body;

    if (!groupId || !Array.isArray(tasks)) {
      return fail(res, 400, "groupId and tasks array are required");
    }

    const result = await getGroupForUser(groupId, req.user);

    if (result.error) {
      return fail(res, ...result.error);
    }

    if (getRole(req.user) !== "student") {
      return fail(res, 403, "Only students can save Gantt chart tasks");
    }

    const chart = await GanttChart.findOne({ groupId });

    if (chart?.isFinalized) {
      return fail(
        res,
        400,
        "Cannot modify Gantt chart after it has been finalized by a supervisor."
      );
    }

    const safeTasks = [];
    const seenTaskIds = new Set();

    for (const task of tasks) {
      if (
        !task ||
        typeof task.taskName !== "string" ||
        !task.taskName.trim() ||
        !task.startDate ||
        !task.endDate
      ) {
        return fail(
          res,
          400,
          "Every task requires a task name, start date, and end date"
        );
      }

      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate < startDate
      ) {
        return fail(res, 400, "Invalid task dates");
      }

      let existing = null;

      if (task._id && chart) {
        if (!mongoose.Types.ObjectId.isValid(String(task._id))) {
          return fail(res, 400, "Invalid task ID");
        }

        const taskId = String(task._id);

        if (seenTaskIds.has(taskId)) {
          return fail(res, 400, "Duplicate task ID");
        }

        seenTaskIds.add(taskId);
        existing = chart.tasks.id(taskId);

        if (!existing) {
          return fail(
            res,
            400,
            "A submitted task does not belong to this Gantt chart"
          );
        }
      } else if (task._id && !chart) {
        return fail(res, 400, "Task ID supplied without an existing chart");
      }

      if (existing) {
        // Keep approval and progress fields controlled by the server.
        safeTasks.push({
          _id: existing._id,
          taskName: task.taskName.trim(),
          startDate,
          endDate,
          progress: existing.progress,
          status: existing.status,
          completionRequested: existing.completionRequested,
          approvalStatus: existing.approvalStatus,
          completionRequestedAt: existing.completionRequestedAt,
          reviewedBy: existing.reviewedBy,
          reviewedAt: existing.reviewedAt,
          reviewComment: existing.reviewComment,
        });
      } else {
        // New tasks cannot be submitted as completed or approved.
        safeTasks.push({
          taskName: task.taskName.trim(),
          startDate,
          endDate,
          progress: 0,
          status: "Pending",
          completionRequested: false,
          approvalStatus: "Not Requested",
          completionRequestedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewComment: "",
        });
      }
    }

    if (chart) {
      chart.tasks = safeTasks;
      chart.updatedAt = new Date();

      await chart.save();

      return res.status(200).json({
        message: "Gantt chart saved successfully",
        chart,
      });
    }

    const newChart = await GanttChart.create({
      groupId,
      tasks: safeTasks,
    });

    return res.status(201).json({
      message: "Gantt chart saved successfully",
      chart: newChart,
    });
  } catch (error) {
    console.error("saveOrUpdateGantt error:", error);
    return fail(res, 500, "Failed to save Gantt chart");
  }
};

// Student: request completion approval for one task.
const requestTaskCompletion = async (req, res) => {
  try {
    const { groupId, taskId } = req.params;

    const result = await getGroupForUser(groupId, req.user);

    if (result.error) {
      return fail(res, ...result.error);
    }

    if (getRole(req.user) !== "student") {
      return fail(res, 403, "Only students can request task completion");
    }

    if (!isValidId(taskId)) {
      return fail(res, 400, "Invalid task ID");
    }

    const chart = await GanttChart.findOne({ groupId });

    if (!chart) {
      return fail(res, 404, "Gantt chart not found");
    }

    if (chart.isFinalized) {
      return fail(res, 400, "Gantt chart is finalized");
    }

    const task = chart.tasks.id(taskId);

    if (!task) {
      return fail(res, 404, "Task not found");
    }

    if (task.approvalStatus === "Approved") {
      return fail(res, 400, "Task completion has already been approved");
    }

    if (task.approvalStatus === "Pending") {
      return fail(
        res,
        400,
        "Task completion request is already pending"
      );
    }

    task.completionRequested = true;
    task.approvalStatus = "Pending";
    task.completionRequestedAt = new Date();
    task.reviewedBy = null;
    task.reviewedAt = null;
    task.reviewComment = "";

    // A pending request is not treated as approved completion.
    task.status = "In Progress";
    task.progress = Math.min(Number(task.progress) || 0, 99);

    chart.updatedAt = new Date();

    await chart.save();

    return res.status(200).json({
      message: "Task completion requested successfully",
      task,
    });
  } catch (error) {
    console.error("requestTaskCompletion error:", error);
    return fail(res, 500, "Failed to request task completion");
  }
};

// Assigned supervisor: approve or reject a task completion request.
const reviewTaskCompletion = async (req, res) => {
  try {
    const { groupId, taskId } = req.params;
    const { decision, comment = "" } = req.body;

    if (!["Approved", "Rejected"].includes(decision)) {
      return fail(res, 400, "decision must be Approved or Rejected");
    }

    if (typeof comment !== "string") {
      return fail(res, 400, "comment must be a string");
    }

    if (comment.length > 1000) {
      return fail(res, 400, "comment cannot exceed 1000 characters");
    }

    const result = await getGroupForUser(groupId, req.user);

    if (result.error) {
      return fail(res, ...result.error);
    }

    if (getRole(req.user) !== "supervisor") {
      return fail(
        res,
        403,
        "Only supervisors can review task completion"
      );
    }

    if (!isValidId(taskId)) {
      return fail(res, 400, "Invalid task ID");
    }

    const chart = await GanttChart.findOne({ groupId });

    if (!chart) {
      return fail(res, 404, "Gantt chart not found");
    }

    if (chart.isFinalized) {
      return fail(res, 400, "Gantt chart is finalized");
    }

    const task = chart.tasks.id(taskId);

    if (!task) {
      return fail(res, 404, "Task not found");
    }

    if (
      !task.completionRequested ||
      task.approvalStatus !== "Pending"
    ) {
      return fail(
        res,
        400,
        "No pending completion request for this task"
      );
    }

    task.approvalStatus = decision;
    task.reviewedBy = req.user._id;
    task.reviewedAt = new Date();
    task.reviewComment = comment.trim();

    if (decision === "Approved") {
      task.status = "Completed";
      task.progress = 100;
    } else {
      task.completionRequested = false;
      task.status = "In Progress";
      task.progress = Math.min(Number(task.progress) || 0, 99);
    }

    chart.updatedAt = new Date();

    await chart.save();

    return res.status(200).json({
      message: `Task completion ${decision.toLowerCase()}`,
      task,
    });
  } catch (error) {
    console.error("reviewTaskCompletion error:", error);
    return fail(res, 500, "Failed to review task completion");
  }
};

// Assigned supervisor: finalize the whole chart.
const finalizeGanttChart = async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await getGroupForUser(groupId, req.user);

    if (result.error) {
      return fail(res, ...result.error);
    }

    if (getRole(req.user) !== "supervisor") {
      return fail(res, 403, "Only supervisors can finalize a Gantt chart");
    }

    const chart = await GanttChart.findOne({ groupId });

    if (!chart) {
      return fail(res, 404, "Gantt chart not found for this group");
    }

    const pending = chart.tasks.some(
      (task) => task.approvalStatus === "Pending"
    );

    if (pending) {
      return fail(
        res,
        400,
        "Review all pending task completion requests before finalizing"
      );
    }

    chart.isFinalized = true;
    chart.finalizedBy = req.user._id;
    chart.updatedAt = new Date();

    await chart.save();

    return res.status(200).json({
      message: "Gantt chart finalized successfully by supervisor",
      chart,
    });
  } catch (error) {
    console.error("finalizeGanttChart error:", error);
    return fail(res, 500, "Failed to finalize Gantt chart");
  }
};

// Retrieve only charts the current user is allowed to access.
const getGanttCharts = async (req, res) => {
  try {
    const { groupId } = req.params;
    const role = getRole(req.user);

    if (groupId) {
      const result = await getGroupForUser(groupId, req.user);

      if (result.error) {
        return fail(res, ...result.error);
      }

      const chart = await GanttChart.findOne({ groupId })
        .populate("groupId")
        .populate("finalizedBy", "name email")
        .populate("tasks.reviewedBy", "name email");

      return res.status(200).json(chart);
    }

    let groupIds;

    if (role === "student") {
      const groups = await Group.find({
        members: req.user._id,
      }).select("_id");

      groupIds = groups.map((group) => group._id);

      const charts = await GanttChart.find({
        groupId: { $in: groupIds },
      })
        .populate("groupId")
        .populate("finalizedBy", "name email")
        .populate("tasks.reviewedBy", "name email");

      return res.status(200).json(charts);
    }

    if (role === "supervisor") {
      const groups = await Group.find({
        supervisor: req.user._id,
      }).select("_id");

      groupIds = groups.map((group) => group._id);

      const charts = await GanttChart.find({
        groupId: { $in: groupIds },
      })
        .populate("groupId")
        .populate("finalizedBy", "name email")
        .populate("tasks.reviewedBy", "name email");

      return res.status(200).json(charts);
    }

    if (role === "coordinator") {
      const charts = await GanttChart.find()
        .populate("groupId")
        .populate("finalizedBy", "name email")
        .populate("tasks.reviewedBy", "name email");

      return res.status(200).json(charts);
    }

    return fail(res, 403, "Access denied");
  } catch (error) {
    console.error("getGanttCharts error:", error);
    return fail(res, 500, "Failed to retrieve Gantt charts");
  }
};

module.exports = {
  saveOrUpdateGantt,
  requestTaskCompletion,
  reviewTaskCompletion,
  finalizeGanttChart,
  getGanttCharts,
};
