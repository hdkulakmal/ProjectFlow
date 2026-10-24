const mongoose = require("mongoose");

// A private, per-user notification. Only the recipient can read or mark it.
// Announcements (visible to many users) live in Announcement.js; publishing one
// creates one Notification per recipient that points back to it.
const NOTIFICATION_TYPES = [
  "announcement",
  "supervisor_request",
  "supervisor_request_accepted",
  "supervisor_request_rejected",
  "project_submitted",
  "project_status",
  "weekly_submission",
  "weekly_feedback",
  "submission",
  "submission_evaluated",
  "meeting_request",
  "meeting_update",
  "general",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "general",
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, trim: true, maxlength: 2000, default: "" },

    // Optional link to the related record, e.g. { refModel: "Meeting", refId }.
    refModel: { type: String, default: null },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },

    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      default: null,
    },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
// One notification per user per announcement (duplicate prevention).
notificationSchema.index(
  { recipient: 1, announcement: 1 },
  { unique: true, partialFilterExpression: { announcement: { $type: "objectId" } } }
);

const Notification = mongoose.model("Notification", notificationSchema);
Notification.TYPES = NOTIFICATION_TYPES;

module.exports = Notification;
