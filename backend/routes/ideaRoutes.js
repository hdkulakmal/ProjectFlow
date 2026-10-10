
const express = require("express");

const {
  checkSimilarIdeas,
} = require("../controller/ideaController");

const router = express.Router();

// Check a student's idea against existing projects
router.post("/check", checkSimilarIdeas);

module.exports = router;
