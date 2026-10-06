const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { CHAT_ROLES, ChatError, normalizeRole } = require("../utils/chatAccess");

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

  // Support the common payload shapes: { id } / { userId } / { _id }
  const userId = decoded.id || decoded.userId || decoded._id;
  const user = userId
    ? await User.findById(userId).select("-passwordHash").lean()
    : null;

  if (!user) throw new ChatError(401, "User no longer exists");
  return user;
};

// Express middleware: reads "Authorization: Bearer <token>"
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    req.user = await authenticateToken(token);
    next();
  } catch (error) {
    res.status(error.status || 401).json({ message: error.message });
  }
};

// Express middleware: only these roles may continue
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
