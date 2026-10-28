// models/courses.js
const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., 'Computer Science & Engineering'
  code: { type: String, required: true, uppercase: true, trim: true } // e.g., 'CSE'
}, { _id: false });

const courseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, // e.g., 'B.Tech', 'Pharmacy'
  totalSemesters: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 12, 
    default: 8 
  },
  branches: [branchSchema]
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);