const express = require("express");

const {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
} = require("../controller/groupController");

const router = express.Router();

// Create a group
router.post("/", createGroup);

// Get all groups
router.get("/", getGroups);

// Get group details
router.get("/:id", getGroup);

// Update group details
router.put("/:id", updateGroup);

module.exports = router;