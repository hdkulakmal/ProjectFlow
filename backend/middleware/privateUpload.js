// File uploads for weekly evaluations and formal submissions.
// Files are stored in ./private_uploads, which is NOT served by express.static,
// so they can only be downloaded through endpoints that check access.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const HttpError = require("../utils/httpError");

const PRIVATE_DIR = path.join(__dirname, "..", "private_uploads");
if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv",
  ".txt", ".md", ".zip", ".png", ".jpg", ".jpeg",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRIVATE_DIR),
  // Random stored name; the original name is kept only in the database.
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(file.originalname || "").toLowerCase()}`),
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new HttpError(400, `File type not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`));
  }
  cb(null, true);
};

const makeUploader = ({ maxBytes = 20 * 1024 * 1024, maxFiles = 5 } = {}) =>
  multer({ storage, fileFilter, limits: { fileSize: maxBytes, files: maxFiles } });

// Turn a multer file into what we store in MongoDB.
const toFileMeta = (file) => ({
  originalName: file.originalname,
  storedName: file.filename,
  mimetype: file.mimetype,
  size: file.size,
});

// Remove uploaded files when the request fails after multer saved them.
const removeFiles = (files) => {
  for (const f of files || []) {
    fs.unlink(path.join(PRIVATE_DIR, f.filename || f.storedName), () => {});
  }
};

// Stream a stored file to the client as a download.
const sendStoredFile = (res, meta) => {
  if (!meta || !meta.storedName || meta.storedName.includes("/") || meta.storedName.includes("\\")) {
    throw new HttpError(404, "File not found");
  }
  const fullPath = path.join(PRIVATE_DIR, meta.storedName);
  if (!fs.existsSync(fullPath)) throw new HttpError(404, "File not found on the server");
  res.download(fullPath, meta.originalName || meta.storedName);
};

module.exports = { PRIVATE_DIR, makeUploader, toFileMeta, removeFiles, sendStoredFile, ALLOWED_EXTENSIONS };
