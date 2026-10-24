// Shared rules for "who may see / act on this group".
//   Coordinator: every group
//   Supervisor:  groups where group.supervisor is them
//   Student:     the group they are a member of
const Group = require("../model/Group");
const HttpError = require("./httpError");
const { objectId } = require("./validate");

const idStr = (value) => (value && value._id ? String(value._id) : value ? String(value) : null);

const isMember = (user, group) =>
  (group.members || []).some((m) => idStr(m) === String(user._id));

const isGroupSupervisor = (user, group) =>
  user.role === "Supervisor" && idStr(group.supervisor) === String(user._id);

const canViewGroup = (user, group) => {
  if (!user || !group) return false;
  if (user.role === "Coordinator") return true;
  if (user.role === "Supervisor") return isGroupSupervisor(user, group);
  if (user.role === "Student") return isMember(user, group);
  return false;
};

const LOCKED_MESSAGE =
  "This feature unlocks after a supervisor has been assigned to your group.";

// Loads a group by id and checks the user may view it. Throws 400/404/403.
const loadViewableGroup = async (user, groupId) => {
  const id = objectId(groupId, "group id");
  const group = await Group.findById(id).lean();
  if (!group) throw new HttpError(404, "Group not found");
  if (!canViewGroup(user, group)) throw new HttpError(403, "You do not have access to this group");
  return group;
};

// The logged-in student's own group. Optionally requires an assigned supervisor
// (PDF: Communication, Weekly Evaluations, Project Timeline and Submissions are
// disabled until a supervisor is assigned).
const loadStudentGroup = async (user, { requireSupervisor = false } = {}) => {
  const group = await Group.findOne({ members: user._id }).lean();
  if (!group) throw new HttpError(404, "No group has been assigned to you yet.");
  if (requireSupervisor && !group.supervisor) throw new HttpError(403, LOCKED_MESSAGE);
  return group;
};

// Group filter for list endpoints, based on role.
// Returns null for Coordinator (no restriction) or a Mongo filter on group ids.
const visibleGroupIds = async (user) => {
  if (user.role === "Coordinator") return null;
  if (user.role === "Supervisor") {
    const groups = await Group.find({ supervisor: user._id }).select("_id").lean();
    return groups.map((g) => g._id);
  }
  const group = await Group.findOne({ members: user._id }).select("_id").lean();
  return group ? [group._id] : [];
};

module.exports = {
  idStr,
  isMember,
  isGroupSupervisor,
  canViewGroup,
  loadViewableGroup,
  loadStudentGroup,
  visibleGroupIds,
  LOCKED_MESSAGE,
};
