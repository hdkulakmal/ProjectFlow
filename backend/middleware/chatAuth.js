const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { CHAT_ROLES, ChatError, normalizeRole } = require("../utils/chatAccess");

// Single source of truth for token authentication (HTTP routes and Socket.IO).
// The password hash is excluded by the User schema (select: false) and again here.
const SAFE_USER_FIELDS = "-passwordHash";

const authenticateToken = async (token) => {
  if (!token) throw new ChatError(401, "Authentication token missing");
  if (!process.env.JWT_SECRET) {
    throw new ChatError(500, "JWT_SECRET is not configured on the server");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ChatError(401, "Invalid or expired token");
  }

  const userId = decoded.userId || decoded.id || decoded._id;
  if (!userId || !/^[a-fA-F0-9]{24}$/.test(String(userId))) {
    throw new ChatError(401, "Invalid or expired token");
  }

  const user = await User.findById(userId).select(SAFE_USER_FIELDS).lean();

  if (!user) throw new ChatError(401, "User no longer exists");
  if (user.isActive === false) {
    throw new ChatError(403, "Account is deactivated. Contact the project coordinator.");
  }
  // A password change or reset invalidates tokens issued before it.
  if (
    user.passwordChangedAt &&
    decoded.iat &&
    decoded.iat * 1000 < new Date(user.passwordChangedAt).getTime()
  ) {
    throw new ChatError(401, "Password was changed. Please log in again.");
  }

  delete user.passwordChangedAt;
  return user;
};

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
    req.user = await authenticateToken(token);
    next();
  } catch (error) {
    const status = error.status || 401;
    if (status >= 500) console.error("Auth error:", error);
    res.status(status).json({
      message: status >= 500 ? "Authentication failed" : error.message,
    });
  }
};

const allowRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(normalizeRole(req.user))) {
      return res
        .status(403)
        .json({ message: "Your role cannot use communication" });
    }
    next();
  };

const allowChatRoles = allowRoles(...CHAT_ROLES);

module.exports = { authenticateToken, protect, allowRoles, allowChatRoles };
