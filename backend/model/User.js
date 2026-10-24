
const mongoose = require("mongoose");

const ROLES = ["Student", "Supervisor", "Coordinator"];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ROLES,
      required: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    registrationNumber: {
      type: String,
      trim: true,
    },

    batch: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { registrationNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      registrationNumber: { $type: "string" },
    },
  }
);

const hideSecrets = (_doc, ret) => {
  delete ret.passwordHash;
  delete ret.passwordChangedAt;
  delete ret.__v;
  return ret;
};

userSchema.set("toJSON", { transform: hideSecrets });
userSchema.set("toObject", { transform: hideSecrets });

const User = mongoose.model("User", userSchema);
User.ROLES = ROLES;

module.exports = User;
