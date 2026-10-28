// backend/models/teachers.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const teacherSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['teacher', 'admin', 'student'],
      default: 'teacher',
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    avatarPublicId: {
      type: String,
      default: '',
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    admissionYear: {
      type: Number,
      min: 2000,
      max: 2100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Auto-increment student year every August
teacherSchema.virtual('currentYear').get(function () {
  if (this.role !== 'student' || !this.admissionYear) return undefined;
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const currentMonth = now.getMonth();
  let year = currentCalendarYear - this.admissionYear + (currentMonth >= 7 ? 1 : 0);
  return Math.min(Math.max(year, 1), 4);
});

teacherSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    console.error(err);
  }
});

teacherSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Teacher', teacherSchema);