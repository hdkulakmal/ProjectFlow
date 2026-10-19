const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "file").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    const blocked =
      /\.(exe|bat|cmd|sh|msi|dll|com|scr|js|mjs|cjs|php|py|vbs)$/i;
    if (blocked.test(file.originalname || "")) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

const uploadMany = upload.array("files", 20);

const handleChatUpload = (req, res) => {
  const files = (req.files || []).map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    url: `/uploads/${f.filename}`,
  }));
  res.status(200).json({ files });
};

module.exports = { uploadMany, handleChatUpload, UPLOAD_DIR };
