// routes/subjects.js
const express = require('express');
const router = express.Router();
const Subject = require('../models/subjects');
const Document = require('../models/documents');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// GET /subjects?course=B.tech&branch=CSE&semester=4
router.get('/', async (req, res) => {
  try {
    const { course, branch, semester } = req.query;
    const query = {};

    if (course || branch || semester) {
      const elemMatchCriteria = {};

      if (course) {
        elemMatchCriteria.course = new RegExp(`^${escapeRegex(course.trim())}$`, 'i');
      }

      if (branch) {
        const cleanBranch = branch.trim().toUpperCase();
        if (cleanBranch === 'COMMON') {
          elemMatchCriteria.$or = [
            { branch: 'COMMON' },
            { semester: Number(semester) || 1 }
          ];
        } else {
          elemMatchCriteria.branch = cleanBranch;
        }
      }

      if (semester && (!branch || branch.trim().toUpperCase() !== 'COMMON')) {
        elemMatchCriteria.semester = Number(semester);
      }

      query['branchMappings'] = { $elemMatch: elemMatchCriteria };
    }

    const subjects = await Subject.find(query).lean();

    // Dual response: Return JSON for React; render EJS as browser fallback
    if (req.xhr || req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.status(200).json({
        success: true,
        selectedCourse: course || '',
        selectedBranch: branch || '',
        selectedSemester: semester || '',
        subjects
      });
    }

    res.render('subjects/index', {
      subjects,
      selectedBranch: branch || '',
      selectedSemester: semester || ''
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error loading subjects: ' + err.message });
  }
});

// GET /subjects/:courseCode/resources
// backend/routes/subjects.js
// GET /subjects/:courseCode/resources
router.get('/:courseCode/resources', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const cleanCode = courseCode.trim();
    const escapedCode = escapeRegex(cleanCode);

    const subject = await Subject.findOne({
      'branchMappings.courseCode': { $regex: new RegExp(`^${escapedCode}$`, 'i') }
    }).lean();

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const documents = await Document.find({ subject: subject._id })
      .populate('uploadedBy', 'name role')
      .sort({ academicYear: -1, createdAt: -1 })
      .lean();

    // Segregate into distinct categories
    const unitwise = documents.filter((d) => d.category === 'unitwise');
    const notes = documents.filter((d) => d.category === 'notes');
    const pyqs = documents.filter((d) => d.category === 'pyq');

    if (
      req.xhr ||
      req.headers.accept?.includes('application/json') ||
      req.query.format === 'json'
    ) {
      return res.status(200).json({
        success: true,
        subject,
        courseCode: cleanCode,
        unitwise,
        notes,
        pyqs,
      });
    }

    res.render('subjects/resources', {
      subject,
      courseCode: cleanCode,
      unitwise,
      notes,
      pyqs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error loading resources: ' + err.message });
  }
});

module.exports = router;