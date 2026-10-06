const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    channel: {
      type: String,
      required: true,
      index: true,
    },

    channelType: {
      type: String,
      enum: ["group", "supervisor", "triad", "private"],
      required: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 2000,
      required: true,
    },

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ channelType: 1, sender: 1 });
messageSchema.index({ channelType: 1, receiver: 1 });

module.exports = mongoose.model("Message", messageSchema);
