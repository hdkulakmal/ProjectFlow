const mongoose = require("mongoose");

// A Coordinator announcement visible to a whole audience (PDF: deadlines,
// presentations, viva schedules, project updates). Publishing one also creates
// one private Notification per recipient.
const AUDIENCES = ["All", "Students", "Supervisors"];
const CATEGORIES = ["General", "Deadline", "Presentation", "Viva", "Project Update"];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, enum: CATEGORIES, default: "General" },
    audience: { type: String, enum: AUDIENCES, default: "All" },
    // Optional: only students of this batch (and all supervisors if audience is All).
    batch: { type: String, trim: true, default: null },
    // Optional date of the event / deadline being announced.
    eventDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

announcementSchema.index({ audience: 1, batch: 1, createdAt: -1 });

const Announcement = mongoose.model("Announcement", announcementSchema);
Announcement.AUDIENCES = AUDIENCES;
Announcement.CATEGORIES = CATEGORIES;

module.exports = Announcement;
