// models/questions.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema(
  {
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    rawDocument: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    unit: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true
    },
    questionNumber: {
      type: String, // e.g., "Q.1(a)", "Q.3(b)"
      trim: true
    },
    questionText: {
      type: String,
      required: true,
      trim: true
    },
    marks: {
      type: Number,
      default: 7
    },
    academicYear: {
      type: Number,
      required: true
    },
    sessionTerm: {
      type: String,
      enum: ['Summer', 'Winter'],
      required: true
    },
    hasDiagram: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Compound index to prevent duplicate entries if a script runs more than once
questionSchema.index(
  { subject: 1, academicYear: 1, sessionTerm: 1, questionNumber: 1, unit: 1 },
  { unique: true }
);

module.exports = mongoose.model('Question', questionSchema);