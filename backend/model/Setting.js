const mongoose = require("mongoose");

// Small key/value store for system-wide settings, e.g. the default supervisor
// slot count set by the Coordinator (applied to supervisors created later too).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
