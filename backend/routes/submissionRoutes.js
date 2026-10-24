const express = require("express");
const {
  createSubmission,
  listSubmissions,
  getSubmission,
  downloadSubmission,
  evaluateSubmission,
} = require("../controller/submissionController");
const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");
const { makeUploader } = require("../middleware/privateUpload");

const router = express.Router();
const upload = makeUploader({ maxBytes: 20 * 1024 * 1024, maxFiles: 1 });

router.use(protect);

// Student submits a formal document (multipart; field "file", max 20 MB)
router.post("/", authorize("Student"), upload.single("file"), createSubmission);
router.get("/", listSubmissions);
router.get("/:id", getSubmission);
router.get("/:id/download", downloadSubmission);
router.patch("/:id/evaluate", authorize("Coordinator"), evaluateSubmission);

module.exports = router;
