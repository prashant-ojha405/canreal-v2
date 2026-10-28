// backend/models/report.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    uploader: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null, // null if reported by an unauthenticated guest student
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      enum: [
        'Inappropriate content',
        'Wrong paper',
        'Blurry / unreadable',
        'Incorrect semester / branch',
        'Outdated syllabus',
        'Other',
      ],
    },
    additionalDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);