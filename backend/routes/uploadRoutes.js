const express = require("express");
const multer = require("multer");

const { uploadExcelOrCsv } = require("../controller/uploadController");
const {
  uploadMany,
  handleChatUpload,
} = require("../controller/chatUploadController");
const { protect, allowChatRoles } = require("../middleware/chatAuth");

const router = express.Router();

// existing: Excel/CSV parse (no auth change — keep as-is)
const memory = multer({ storage: multer.memoryStorage() });
router.post("/", memory.single("file"), uploadExcelOrCsv);

// NEW: chat file/folder upload  POST /api/upload/chat  field name: files
router.post("/chat", protect, allowChatRoles, (req, res) => {
  uploadMany(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    handleChatUpload(req, res);
  });
});

module.exports = router;
