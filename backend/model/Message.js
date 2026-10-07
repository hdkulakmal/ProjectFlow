const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
  },
  { _id: false },
);

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
      default: "",
    },

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // edit / delete
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    deleted: { type: Boolean, default: false },

    // file attachments
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ channelType: 1, sender: 1 });
messageSchema.index({ channelType: 1, receiver: 1 });

module.exports = mongoose.model("Message", messageSchema);
