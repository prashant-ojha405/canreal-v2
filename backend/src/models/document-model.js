const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['syllabus', 'pyq', 'notes', 'unitwise'],
        message: '{VALUE} is not a valid category'
      },
      lowercase: true,
      trim: true
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required']
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required']
    },
    academicYear: {
      type: Number,
      min: 2000,
      max: 2200
    },
    viewCount: { 
      type: Number, 
      default: 0 
    },
    publicId: String
  },
  {timestamps: true}
);

// Index to quickly fetch and sort all resources for a specific subject
documentSchema.index({ subject: 1, category: 1, academicYear: -1 });

module.exports = mongoose.model('Document', documentSchema);