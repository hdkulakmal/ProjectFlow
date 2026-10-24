const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    storedName: String,
    mimetype: String,
    size: Number,
  },
  { _id: true }
);

// PDF: "Students submit their weekly work. The supervisor views the submitted
// work and provides feedback."
const weeklyEvaluationSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    weekNumber: { type: Number, required: true, min: 1, max: 60 },
    workSummary: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: { type: [fileSchema], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: { type: String, enum: ["Submitted", "Reviewed"], default: "Submitted" },
    feedback: { type: String, trim: true, maxlength: 5000, default: "" },
    feedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    feedbackAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One entry per group per week.
weeklyEvaluationSchema.index({ group: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model("WeeklyEvaluation", weeklyEvaluationSchema);
