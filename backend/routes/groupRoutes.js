const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const {
  createGroup,
  getGroup,
  updateGroup,
  uploadAndGenerateGroups,
  confirmGroup,
} = require("../controller/groupController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Create a group
router.post("/", protect, createGroup);

// Get group details
router.get("/:id", protect, getGroup);

// Update group details
router.put("/:id", protect, updateGroup);

// Upload Excel & Auto-Generate Draft Groups
router.post(
  "/upload-excel",
  protect,
  authorize("Coordinator"),
  upload.single("file"),
  uploadAndGenerateGroups
);

// Confirm or Edit Draft Group Details
router.put("/:groupId/confirm", protect, authorize("Coordinator"), confirmGroup);

module.exports = router;