// backend/models/inviteToken.js
import mongoose from "mongoose";

const userInviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email to authorize is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
    targetRole: {
      type: String,
      enum: ['student', 'teacher'],
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