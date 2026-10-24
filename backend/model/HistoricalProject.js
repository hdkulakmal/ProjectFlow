
const mongoose = require("mongoose");

const historicalProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    batch: {
      type: String,
      required: true,
      trim: true,
    },

    groupNumber: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    supervisor: {
      type: String,
      default: "",
    },

    archivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "HistoricalProject",
  historicalProjectSchema
);
