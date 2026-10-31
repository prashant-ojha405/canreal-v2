// backend/src/models/userInvite-model.js
import mongoose from "mongoose";

const userInviteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    email: {
      type: String,
      required: [true, 'Email to authorize is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    targetRole: {
      type: String,
      enum: ['student', 'teacher'],
      required: true,
    },
    emrollmentNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const UserInvite = mongoose.model('UserInvite', userInviteSchema);
export default UserInvite;