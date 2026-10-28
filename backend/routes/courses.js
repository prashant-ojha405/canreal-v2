// backend/routes/courses.js
const express = require('express');
const router = express.Router();
const Course = require('../models/courses');
const Subject = require('../models/subjects');
const Document = require('../models/documents');
const cloudinary = require('../config/cloudinary');
const { verifyUser, authorizeRoles } = require('../middleware/auth');

// Public: Fetch all courses and their branches
router.get('/public', async (req, res) => {
  try {
    const courses = await Course.find().lean();
    return res.status(200).json({ success: true, courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin/Teacher: Add a branch to an existing course
router.post('/admin/:id/branches', verifyUser, authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Branch name and code are required.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const cleanCode = code.trim().toUpperCase();
    if (course.branches.some((b) => b.code === cleanCode)) {
      return res.status(400).json({ success: false, message: 'Branch code already exists in this course.' });
    }

    course.branches.push({ name: name.trim(), code: cleanCode });
    await course.save();

    return res.status(201).json({ success: true, message: 'Branch added successfully!', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin/Teacher: Add a subject
router.post('/admin/subject', verifyUser, authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const { courseName, branchCode, semester, title, courseCode } = req.body;
    if (!courseName || !branchCode || !semester || !title || !courseCode) {
      return res.status(400).json({ success: false, message: 'All subject fields are required.' });
    }

    const cleanCourseCode = courseCode.trim().toUpperCase();
    const cleanBranch = branchCode.trim().toUpperCase();

    let subject = await Subject.findOne({ title: title.trim() });
    if (!subject) {
      subject = new Subject({
        title: title.trim(),
        name: title.trim(),
        code: cleanCourseCode,
        branchMappings: [{ branch: cleanBranch, semester: Number(semester), courseCode: cleanCourseCode }],
      });
    } else {
      const exists = subject.branchMappings.some(
        (m) => m.branch === cleanBranch && m.semester === Number(semester)
      );
      if (exists) {
        return res.status(400).json({ success: false, message: 'Subject already mapped to this branch/semester.' });
      }
      subject.branchMappings.push({ branch: cleanBranch, semester: Number(semester), courseCode: cleanCourseCode });
    }

    await subject.save();
    return res.status(201).json({ success: true, message: 'Subject added successfully!', subject });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Complete Setup: Course + Branches + Subjects
router.post('/admin/complete-setup', verifyUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, totalSemesters, branches, subjects } = req.body;
    if (!name || !branches || branches.length === 0) {
      return res.status(400).json({ success: false, message: 'Course name and branches are required.' });
    }

    const newCourse = await Course.create({
      name: name.trim(),
      totalSemesters: Number(totalSemesters) || 8,
      branches: branches.map((b) => ({ name: b.name.trim(), code: b.code.trim().toUpperCase() })),
    });

    if (subjects && subjects.length > 0) {
      for (const s of subjects) {
        if (s.title && s.courseCode && s.branch) {
          await Subject.create({
            title: s.title.trim(),
            name: s.title.trim(),
            code: s.courseCode.trim().toUpperCase(),
            branchMappings: [
              {
                branch: s.branch.trim().toUpperCase(),
                semester: Number(s.semester) || 1,
                courseCode: s.courseCode.trim().toUpperCase(),
              },
            ],
          });
        }
      }
    }

    return res.status(201).json({ success: true, message: `Course "${newCourse.name}" and subjects created!` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// ADMINISTRATIVE CASCADE DELETIONS (SUPER ADMIN ONLY)
// =========================================================================

// 1. DELETE COURSE (Cascade: Course -> Branches -> Unlinks/Deletes Subjects & Assets)
router.delete('/admin/course/:courseId', verifyUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const branchCodes = course.branches.map((b) => b.code);

    // Find subjects associated with these branches
    const subjects = await Subject.find({ 'branchMappings.branch': { $in: branchCodes } });
    const subjectIds = subjects.map((s) => s._id);

    // Clean up physical Cloudinary assets for documents tied to these subjects
    const docs = await Document.find({ subject: { $in: subjectIds } });
    for (const doc of docs) {
      if (doc.publicId) {
        try {
          await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'raw' });
        } catch (err) {
          console.warn('Asset deletion warning:', err.message);
        }
      }
    }

    // Delete documents & subjects
    await Document.deleteMany({ subject: { $in: subjectIds } });
    await Subject.deleteMany({ _id: { $in: subjectIds } });
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({
      success: true,
      message: `Course "${course.name}", its branches, subjects, and files have been removed.`,
    });
  } catch (error) {
    console.error('Course cascade deletion error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. DELETE BRANCH FROM COURSE
router.delete('/admin/:courseId/branch/:branchCode', verifyUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { courseId, branchCode } = req.params;
    const cleanCode = branchCode.trim().toUpperCase();

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    course.branches = course.branches.filter((b) => b.code !== cleanCode);
    await course.save();

    // Pull branch mappings from Subject collection
    await Subject.updateMany(
      { 'branchMappings.branch': cleanCode },
      { $pull: { branchMappings: { branch: cleanCode } } }
    );

    // Clean up subjects that no longer have any branch mappings
    await Subject.deleteMany({ branchMappings: { $size: 0 } });

    return res.status(200).json({
      success: true,
      message: `Branch "${cleanCode}" removed from "${course.name}".`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. DELETE SPECIFIC SUBJECT (Cascade: Subject -> Attached Documents & Cloudinary Files)
router.delete('/admin/subject/:subjectId', verifyUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // Clean up attached documents from Cloudinary
    const docs = await Document.find({ subject: subjectId });
    for (const doc of docs) {
      if (doc.publicId) {
        try {
          await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'raw' });
        } catch (err) {
          console.warn('Asset deletion warning:', err.message);
        }
      }
    }

    await Document.deleteMany({ subject: subjectId });
    await Subject.findByIdAndDelete(subjectId);

    return res.status(200).json({
      success: true,
      message: `Subject "${subject.title || subject.code}" and its associated files were deleted.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;