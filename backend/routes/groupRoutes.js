
const express = require("express");
const upload = require("../middleware/uploadMiddleware");

const {
  createGroup,
  getGroups,
  getGroup,
  getMyGroup,
  updateGroup,
  uploadAndGenerateGroups,
  confirmGroup,
} = require("../controller/groupController");

const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Create a group
router.post("/", protect, createGroup);

// Get all groups (authenticated users only)
router.get("/", protect, getGroups);

// Get the logged-in student's group
router.get("/my-group", protect, getMyGroup);

// Upload Excel (Coordinator only)
router.post(
  "/upload-excel",
  protect,
  authorize("Coordinator"),
  upload.single("file"),
  uploadAndGenerateGroups
);

// Confirm or edit group (Coordinator only)
router.put(
  "/:groupId/confirm",
  protect,
  authorize("Coordinator"),
  confirmGroup
);

// Get group details by ID
router.get("/:id", protect, getGroup);

// Update group details
router.put("/:id", protect, updateGroup);

module.exports = router;
