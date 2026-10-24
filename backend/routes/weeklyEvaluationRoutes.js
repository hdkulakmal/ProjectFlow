const express = require("express");
const {
  createWeeklyEvaluation,
  listWeeklyEvaluations,
  getWeeklyEvaluation,
  updateWeeklyEvaluation,
  giveFeedback,
  downloadAttachment,
} = require("../controller/weeklyEvaluationController");
const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");
const { makeUploader } = require("../middleware/privateUpload");

const router = express.Router();
const upload = makeUploader({ maxBytes: 10 * 1024 * 1024, maxFiles: 5 });

router.use(protect);

// Student submits weekly work (multipart; optional "files", up to 5 x 10 MB)
router.post("/", authorize("Student"), upload.array("files", 5), createWeeklyEvaluation);
router.get("/", listWeeklyEvaluations);
router.get("/:id", getWeeklyEvaluation);
router.put("/:id", authorize("Student"), updateWeeklyEvaluation);
router.patch("/:id/feedback", authorize("Supervisor"), giveFeedback);
router.get("/:id/files/:fileId", downloadAttachment);

module.exports = router;
