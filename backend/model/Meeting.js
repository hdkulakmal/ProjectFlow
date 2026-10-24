const mongoose = require("mongoose");

const MEETING_STATUSES = ["Requested", "Scheduled", "Declined", "Cancelled", "Completed"];

// PDF: students request a meeting with their assigned supervisor; the
// supervisor sees requests and manages scheduled meetings with the group.
const meetingSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agenda: { type: String, required: true, trim: true, maxlength: 2000 },
    proposedAt: { type: Date, default: null }, // time suggested by the student
    scheduledAt: { type: Date, default: null }, // time confirmed by the supervisor
    location: { type: String, trim: true, maxlength: 300, default: "" }, // room or online link
    note: { type: String, trim: true, maxlength: 2000, default: "" }, // supervisor's note
    status: { type: String, enum: MEETING_STATUSES, default: "Requested" },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

meetingSchema.index({ group: 1, createdAt: -1 });
meetingSchema.index({ supervisor: 1, status: 1, scheduledAt: 1 });

const Meeting = mongoose.model("Meeting", meetingSchema);
Meeting.STATUSES = MEETING_STATUSES;

module.exports = Meeting;
