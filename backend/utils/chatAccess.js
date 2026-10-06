const ROLES = {
  STUDENT: "student",
  SUPERVISOR: "supervisor",
  COORDINATOR: "coordinator",
  ADMIN: "admin",
};
const CHAT_ROLES = [ROLES.STUDENT, ROLES.SUPERVISOR, ROLES.COORDINATOR];

const CHANNEL_TYPES = {
  GROUP: "group",
  SUPERVISOR: "supervisor",
  TRIAD: "triad",
  PRIVATE: "private",
};

class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const normalizeRole = (user) => {
  const raw = user?.role?.role_name ?? user?.role ?? "";
  const role = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return role === "project_coordinator" ? ROLES.COORDINATOR : role;
};

const idOf = (value) => {
  if (value === null || value === undefined) return null;
  if (value.user !== undefined) return idOf(value.user);
  return String(value._id ?? value);
};

const isActiveUser = (user) => {
  if (!user) return false;
  if (user.isActive === false) return false;
  return !["inactive", "deactivated", "disabled"].includes(
    String(user.status ?? "").toLowerCase(),
  );
};

const canChat = (user) =>
  isActiveUser(user) && CHAT_ROLES.includes(normalizeRole(user));

// The supervisor who has ACCEPTED this group (null before that)
const assignedSupervisorId = (group) => idOf(group?.supervisor);

// ----------------------------- channel ids ---------------------------------
const OID = "[a-fA-F0-9]{24}";
const GROUP_RE = new RegExp(`^(group|supervisor|triad):(${OID})$`, "i");
const PRIVATE_RE = new RegExp(`^private:(${OID}):(${OID})$`, "i");

// Validates a channel id and returns it in canonical form
const parseChannelId = (raw) => {
  const text = String(raw ?? "").trim();

  let m = text.match(GROUP_RE);
  if (m) {
    const groupId = m[2].toLowerCase();
    const type = m[1].toLowerCase();
    return { id: `${type}:${groupId}`, type, groupId };
  }

  m = text.match(PRIVATE_RE);
  if (m) {
    const userIds = [m[1].toLowerCase(), m[2].toLowerCase()].sort();
    if (userIds[0] === userIds[1]) {
      throw new ChatError(400, "You cannot chat with yourself");
    }
    return {
      id: `private:${userIds[0]}:${userIds[1]}`,
      type: CHANNEL_TYPES.PRIVATE,
      userIds,
    };
  }

  throw new ChatError(400, "Invalid channel id");
};

const groupChannelId = (type, groupId) =>
  parseChannelId(`${type}:${groupId}`).id;
const privateChannelId = (userA, userB) =>
  parseChannelId(`private:${userA}:${userB}`).id;

// ------------------------------ the rules -----------------------------------
const deny = (status, reason) => ({ allowed: false, status, reason });
const allow = { allowed: true };

const getChannelAccess = (user, channel, ctx = {}) => {
  if (!isActiveUser(user)) return deny(403, "Account is not active");
  const role = normalizeRole(user);
  if (!CHAT_ROLES.includes(role)) {
    return deny(403, "Your role cannot use communication");
  }
  const me = idOf(user);

  // ---- private: any chat user <-> any other chat user ----
  if (channel.type === CHANNEL_TYPES.PRIVATE) {
    if (!channel.userIds.includes(me)) {
      return deny(403, "This is not your conversation");
    }
    if (!canChat(ctx.peer))
      return deny(404, "That user is not available for chat");
    return allow;
  }

  // ---- group based channels ----
  const group = ctx.group;
  if (!group) return deny(404, "Group not found");

  const isMember =
    role === ROLES.STUDENT && (group.members || []).some((m) => idOf(m) === me);
  const supervisorId = assignedSupervisorId(group);
  const isGroupSupervisor =
    role === ROLES.SUPERVISOR && supervisorId !== null && supervisorId === me;
  const isCoordinator = role === ROLES.COORDINATOR;

  const notYours = deny(403, "You are not part of this channel");
  const notReady = deny(
    403,
    "This channel opens after the supervisor accepts the group's request",
  );

  switch (channel.type) {
    case CHANNEL_TYPES.GROUP: // students only
      return isMember ? allow : notYours;

    case CHANNEL_TYPES.SUPERVISOR: // students + supervisor
      if (!isMember && !isGroupSupervisor) return notYours;
      return supervisorId ? allow : notReady;

    case CHANNEL_TYPES.TRIAD: // students + supervisor + coordinator
      if (!isMember && !isGroupSupervisor && !isCoordinator) return notYours;
      return supervisorId ? allow : notReady;

    default:
      return deny(400, "Unknown channel type");
  }
};

module.exports = {
  ROLES,
  CHAT_ROLES,
  CHANNEL_TYPES,
  ChatError,
  normalizeRole,
  idOf,
  isActiveUser,
  canChat,
  assignedSupervisorId,
  parseChannelId,
  groupChannelId,
  privateChannelId,
  getChannelAccess,
};
