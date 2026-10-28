const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
 
  branchMappings: [{
    course: {
      type : String,
      required: true
    },
    branch: { 
      type: String,  
      required: true 
    },
    semester: { 
      type: Number, 
      min: 1, 
      max: 8,  
    },
    year: { 
      type: Number, 
      min: 1, 
      max: 4 
    },
    courseCode: { 
      type: String, 
      required: true 
    } 
  }],

 
  syllabus: [{
    unitNumber: { type: Number, required: true },
    topics: [{ type: String }] 
  }],

  assetFolderId: { type: String, required: true } 
  
}, { timestamps: true });


subjectSchema.index({ "branchMappings.course": 1 , "branchMappings.branch": 1, "branchMappings.semester": 1 });

module.exports = mongoose.model('Subject', subjectSchema);