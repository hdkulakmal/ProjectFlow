const mongoose = require("mongoose");

const SUBMISSION_TYPES = ["Proposal", "Presentation", "Report", "Other"];

// PDF: "Students submit formal documents such as proposals, presentations,
// reports... Supervisors and Project Coordinators can view them." The
// Coordinator can also evaluate them.
const submissionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    type: { type: String, enum: SUBMISSION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    file: {
      originalName: { type: String, required: true },
      storedName: { type: String, required: true },
      mimetype: String,
      size: Number,
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: { type: String, enum: ["Submitted", "Evaluated"], default: "Submitted" },
    evaluation: {
      marks: { type: Number, min: 0, max: 100, default: null },
      comments: { type: String, trim: true, maxlength: 5000, default: "" },
      evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      evaluatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

submissionSchema.index({ group: 1, type: 1, createdAt: -1 });

const Submission = mongoose.model("Submission", submissionSchema);
Submission.TYPES = SUBMISSION_TYPES;

module.exports = Submission;
