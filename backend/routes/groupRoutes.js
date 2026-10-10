
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

// Get one group by ID
router.get("/:id", getGroup);

// Update a group
router.put("/:id", updateGroup);

module.exports = router;
