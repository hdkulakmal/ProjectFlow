const mongoose = require("mongoose");

const supervisorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      default: 5, // Default maximum limit set by Project Coordinator
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supervisor", supervisorSchema);