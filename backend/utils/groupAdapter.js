const User = require("../model/User");
const Group = require("../model/Group");
const { canChat, normalizeRole, ROLES } = require("./chatAccess");

const USER_FIELDS = "fullName email role";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserById = (id) => User.findById(id).select(USER_FIELDS).lean();
const findUsersByIds = (ids) =>
  User.find({ _id: { $in: ids } })
    .select(USER_FIELDS)
    .lean();
const findCoordinators = async () =>
  (
    await User.find({ role: /coordinator/i })
      .select(USER_FIELDS)
      .lean()
  ).filter((u) => normalizeRole(u) === ROLES.COORDINATOR);

// People a user may start a private chat with (never admins / inactive users)
const searchChatUsers = async (exceptUserId, search = "") => {
  const cond = { _id: { $ne: exceptUserId } };
  const text = String(search).trim();
  if (text) {
    const rx = new RegExp(escapeRegex(text), "i");
    cond.$or = [{ fullName: rx }, { email: rx }];
  }
  const users = await User.find(cond)
    .select(USER_FIELDS)
    .sort({ fullName: 1 })
    .limit(100)
    .lean();
  return users.filter(canChat).slice(0, 20);
};

const findGroupById = (id) => Group.findById(id).lean();
const findGroupForStudent = (userId) =>
  Group.findOne({ members: userId }).lean();
const findGroupsForSupervisor = (userId) =>
  Group.find({ supervisor: userId }).lean();
const findGroupsWithSupervisor = () =>
  Group.find({ supervisor: { $ne: null } }).lean();

const groupLabel = (group) =>
  group.group_code ||
  group.name ||
  group.title ||
  (group.groupNumber
    ? `Group ${group.groupNumber}`
    : `Group ${String(group._id).slice(-4)}`);

module.exports = {
  USER_FIELDS,
  findUserById,
  findUsersByIds,
  findCoordinators,
  searchChatUsers,
  findGroupById,
  findGroupForStudent,
  findGroupsForSupervisor,
  findGroupsWithSupervisor,
  groupLabel,
};
