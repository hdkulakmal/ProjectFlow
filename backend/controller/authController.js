
const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../utils/httpError");
const v = require("../utils/validate");

const BCRYPT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

// Public view of a user. Never includes the password hash.
const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  phoneNumber: user.phoneNumber,
  registrationNumber: user.registrationNumber,
  batch: user.batch,
  isActive: user.isActive !== false,
});

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// POST /api/auth/register  (public, always creates a Student)
const registerUser = async (req, res) => {
  const input = v.body(req);

  const fullName = v.text(input.fullName, "Full name", { max: 100 });
  if (!v.isEmail(input.email)) {
    throw new HttpError(400, "A valid email address is required");
  }
  const email = v.normalizeEmail(input.email);
  const password = v.password(input.password);
  const phoneNumber = v.text(input.phoneNumber, "Phone number", { required: false, max: 30 });
  const registrationNumber = v.text(input.registrationNumber, "Registration number", {
    required: false,
    max: 50,
  });

  // The role is fixed. Any "role" sent by the client is ignored, so nobody
  // can register themselves as a Supervisor or Coordinator.
  const role = "Student";

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new HttpError(409, "Email is already registered");
  }
  if (registrationNumber) {
    const regTaken = await User.findOne({ registrationNumber }).lean();
    if (regTaken) throw new HttpError(409, "Registration number is already registered");
  }

  const user = await User.create({
    fullName,
    email,
    passwordHash: await hashPassword(password),
    role,
    phoneNumber,
    registrationNumber,
  });

  return res.status(201).json({
    message: "User registered successfully",
    user: publicUser(user),
  });
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = v.body(req);

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: v.normalizeEmail(email) }).select("+passwordHash");

  // Same message for unknown email and wrong password (no account enumeration).
  const isPasswordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !isPasswordValid) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.isActive === false) {
    throw new HttpError(403, "Account is deactivated. Contact the project coordinator.");
  }

  return res.status(200).json({
    message: "Login successful",
    token: signToken(user),
    user: publicUser(user),
  });
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    user: publicUser(req.user),
  });
};

// PATCH /api/auth/profile  (only personal contact details; never role, email or status)
const updateProfile = async (req, res) => {
  const input = v.body(req);
  const allowed = ["fullName", "phoneNumber"];
  const blocked = Object.keys(input).filter((key) => !allowed.includes(key));
  if (blocked.length) {
    throw new HttpError(400, `These fields cannot be changed here: ${blocked.join(", ")}`);
  }

  const update = {};
  if (input.fullName !== undefined) update.fullName = v.text(input.fullName, "Full name", { max: 100 });
  if (input.phoneNumber !== undefined) {
    update.phoneNumber = v.text(input.phoneNumber, "Phone number", { required: false, max: 30 }) || "";
  }
  if (!Object.keys(update).length) throw new HttpError(400, "Nothing to update");

  const user = await User.findByIdAndUpdate(req.user._id, update, {
    returnDocument: "after",
    runValidators: true,
  });
  res.status(200).json({ message: "Profile updated", user: publicUser(user) });
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = v.body(req);
  if (typeof currentPassword !== "string" || !currentPassword) {
    throw new HttpError(400, "Current password is required");
  }
  v.password(newPassword, "New password");
  if (currentPassword === newPassword) {
    throw new HttpError(400, "New password must be different from the current password");
  }

  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!user) throw new HttpError(404, "User not found");

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new HttpError(401, "Current password is incorrect");

  user.passwordHash = await hashPassword(newPassword);
  // 1 second in the past so the fresh token below (iat in whole seconds) stays valid.
  user.passwordChangedAt = new Date(Date.now() - 1000);
  await user.save();

  res.status(200).json({
    message: "Password changed. Other sessions have been signed out.",
    token: signToken(user),
  });
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  publicUser,
  hashPassword,
  signToken,
};
