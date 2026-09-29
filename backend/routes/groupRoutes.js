const express = require("express");

const {
  createGroup,
  getGroup,
  updateGroup,
} = require("../controller/groupController");

const router = express.Router();

// Create a group
router.post("/", createGroup);

// Get group details
router.get("/:id", getGroup);

// Update group details
router.put("/:id", updateGroup);

module.exports = router;