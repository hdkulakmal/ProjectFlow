// Coordinator user management (PDF "Admin > Users"; you chose to give these
// powers to the Coordinator instead of adding an Admin role).
const User = require("../model/User");
const Group = require("../model/Group");
const Supervisor = require("../model/Supervisor");
const HttpError = require("../utils/httpError");
const v = require("../utils/validate");
const { publicUser, hashPassword } = require("./authController");
const { getDefaultCapacity } = require("../utils/capacity");

const ROLES = User.ROLES;

const readUserFields = async (input, { partial = false, currentId = null } = {}) => {
  const out = {};
  if (!partial || input.fullName !== undefined) out.fullName = v.text(input.fullName, "Full name", { max: 100 });
  if (!partial || input.email !== undefined) {
    if (!v.isEmail(input.email)) throw new HttpError(400, "A valid email address is required");
    out.email = v.normalizeEmail(input.email);
    const taken = await User.findOne({ email: out.email, _id: { $ne: currentId } }).lean();
    if (taken) throw new HttpError(409, "Email is already registered");
  }
  if (input.phoneNumber !== undefined) {
    out.phoneNumber = v.text(input.phoneNumber, "Phone number", { required: false, max: 30 }) || "";
  }
  if (input.batch !== undefined) out.batch = v.text(String(input.batch ?? ""), "Batch", { required: false, max: 50 }) || "";
  if (input.registrationNumber !== undefined) {
    const reg = v.text(input.registrationNumber, "Registration number", { required: false, max: 50 });
    if (reg) {
      const taken = await User.findOne({ registrationNumber: reg, _id: { $ne: currentId } }).lean();
      if (taken) throw new HttpError(409, "Registration number is already registered");
      out.registrationNumber = reg;
    } else {
      out.registrationNumber = undefined; // cleared below with $unset
    }
  }
  return out;
};

// GET /api/users?role=&search=&isActive=&page=&limit=
const listUsers = async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = v.oneOf(req.query.role, "role", ROLES);
  if (req.query.isActive === "true") filter.isActive = { $ne: false };
  if (req.query.isActive === "false") filter.isActive = false;
  if (req.query.search) {
    const rx = { $regex: v.escapeRegex(String(req.query.search).trim()), $options: "i" };
    filter.$or = [{ fullName: rx }, { email: rx }, { registrationNumber: rx }];
  }
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 50, maxLimit: 200 });

  const [users, total] = await Promise.all([
    User.find(filter).sort({ role: 1, fullName: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.status(200).json({ total, page, limit, users: users.map(publicUser) });
};

// GET /api/users/:id
const getUser = async (req, res) => {
  const id = v.objectId(req.params.id, "user id");
  const user = await User.findById(id).lean();
  if (!user) throw new HttpError(404, "User not found");

  const extra = {};
  if (user.role === "Student") {
    const group = await Group.findOne({ members: id }).select("groupNumber batch").lean();
    extra.group = group || null;
  } else if (user.role === "Supervisor") {
    const profile = await Supervisor.findOne({ user: id }).lean();
    extra.capacity = profile ? profile.capacity : await getDefaultCapacity();
    extra.assignedGroupsCount = await Group.countDocuments({ supervisor: id });
  }
  res.status(200).json({ user: publicUser(user), ...extra });
};

// POST /api/users  body: { fullName, email, password, role, phoneNumber?, registrationNumber?, batch? }
// The Coordinator gives the new user a temporary password and shares it privately.
const createUser = async (req, res) => {
  const input = v.body(req);
  const role = v.oneOf(input.role, "role", ROLES);
  const fields = await readUserFields(input);
  const password = v.password(input.password);

  const user = await User.create({
    ...fields,
    role,
    passwordHash: await hashPassword(password),
  });

  if (role === "Supervisor") {
    await Supervisor.updateOne(
      { user: user._id },
      { $setOnInsert: { capacity: await getDefaultCapacity() } },
      { upsert: true }
    );
  }

  res.status(201).json({ message: `${role} account created`, user: publicUser(user) });
};

// PATCH /api/users/:id  body: any of { fullName, email, phoneNumber, registrationNumber, batch, role }
const updateUser = async (req, res) => {
  const id = v.objectId(req.params.id, "user id");
  const input = v.body(req);
  const allowed = ["fullName", "email", "phoneNumber", "registrationNumber", "batch", "role"];
  const blocked = Object.keys(input).filter((k) => !allowed.includes(k));
  if (blocked.length) throw new HttpError(400, `These fields cannot be changed here: ${blocked.join(", ")}`);

  const user = await User.findById(id);
  if (!user) throw new HttpError(404, "User not found");

  const fields = await readUserFields(input, { partial: true, currentId: user._id });

  if (input.role !== undefined && input.role !== user.role) {
    const role = v.oneOf(input.role, "role", ROLES);
    if (String(user._id) === String(req.user._id)) {
      throw new HttpError(400, "You cannot change your own role");
    }
    // Changing the role of someone already linked to groups would break those groups.
    const linked =
      (await Group.exists({ members: user._id })) || (await Group.exists({ supervisor: user._id }));
    if (linked) {
      throw new HttpError(409, "This user is linked to a group. Remove them from the group before changing the role.");
    }
    fields.role = role;
  }

  if ("registrationNumber" in fields && fields.registrationNumber === undefined) {
    user.set("registrationNumber", undefined);
    delete fields.registrationNumber;
  }
  Object.assign(user, fields);
  await user.save();

  if (user.role === "Supervisor") {
    await Supervisor.updateOne(
      { user: user._id },
      { $setOnInsert: { capacity: await getDefaultCapacity() } },
      { upsert: true }
    );
  }

  res.status(200).json({ message: "User updated", user: publicUser(user) });
};

// PATCH /api/users/:id/status  body: { isActive: true | false }
const setUserStatus = async (req, res) => {
  const id = v.objectId(req.params.id, "user id");
  const { isActive } = v.body(req);
  if (typeof isActive !== "boolean") throw new HttpError(400, "isActive must be true or false");
  if (String(id) === String(req.user._id) && !isActive) {
    throw new HttpError(400, "You cannot deactivate your own account");
  }

  const user = await User.findByIdAndUpdate(id, { isActive }, { returnDocument: "after" });
  if (!user) throw new HttpError(404, "User not found");

  const response = { message: isActive ? "Account activated" : "Account deactivated", user: publicUser(user) };
  if (!isActive && user.role === "Supervisor") {
    const count = await Group.countDocuments({ supervisor: user._id });
    if (count) response.warning = `This supervisor still supervises ${count} group(s). Reassign them if needed.`;
  }
  res.status(200).json(response);
};

// POST /api/users/:id/reset-password  body: { newPassword }
// Sets a temporary password chosen by the Coordinator and signs the user out everywhere.
const resetUserPassword = async (req, res) => {
  const id = v.objectId(req.params.id, "user id");
  const newPassword = v.password(v.body(req).newPassword, "New password");

  const user = await User.findById(id);
  if (!user) throw new HttpError(404, "User not found");
  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  res.status(200).json({ message: "Password reset. Share the temporary password with the user privately." });
};

module.exports = { listUsers, getUser, createUser, updateUser, setUserStatus, resetUserPassword };
