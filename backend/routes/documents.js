// backend/routes/documents.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const streamifier = require('streamifier');
const Document = require('../models/documents');
const Subject = require('../models/subjects');
const cloudinary = require('../config/cloudinary');
const { verifyUser } = require('../middleware/auth');
const convertImagesToPdf = require('../utils/imageToPdf');

// Configure Multer for in-memory file buffers (up to 15 files, 15 MB each)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files (JPG, PNG, WEBP) are allowed.'), false);
    }
  },
});

// =========================================================================
// 1. GET /documents/subjects/search (Autocomplete search for upload dropdown)
// =========================================================================
router.get('/subjects/search', verifyUser, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, subjects: [] });
    }

    const cleanQuery = q.trim();
    const regex = new RegExp(cleanQuery, 'i');

    const subjects = await Subject.find({
      $or: [
        { code: regex },
        { name: regex },
        { title: regex },
        { 'branchMappings.courseCode': regex },
      ],
    })
      .limit(10)
      .lean();

    return res.status(200).json({ success: true, subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. GET /documents/:id/view (View Counter & Direct Cloudinary Redirect)
// =========================================================================
router.get('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { returnDocument: 'after' }
    );

    if (!doc || !doc.fileUrl) {
      return res.status(404).send('Document or file URL not found.');
    }

    return res.redirect(doc.fileUrl);
  } catch (error) {
    return res.status(500).send('Error registering document view: ' + error.message);
  }
});

// =========================================================================
// 3. POST /documents/upload (Upload with Quotas, Replacement & FIFO Window)
// =========================================================================
router.post('/upload', verifyUser, upload.array('files', 15), async (req, res) => {
  try {
    const {
      title,
      category,
      subjectCode,
      academicYear,
      sessionTerm,
      replaceExistingId,
    } = req.body;
    const currentUser = req.user;

    if (!title || !category || !subjectCode) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and subjectCode are required.',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please attach at least one PDF or image scan.',
      });
    }

    // A. Resolve Target Subject
    const cleanCode = subjectCode.trim();
    const subject = await Subject.findOne({
      $or: [
        { code: cleanCode },
        { 'branchMappings.courseCode': cleanCode },
        { title: cleanCode },
      ],
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // ----------------------------------------------------
    // B. QUOTA & CONFLICT EVALUATIONS
    // ----------------------------------------------------

    // 1. NOTES: Hard Cap of 5 documents per subject
    if (category === 'notes') {
      const existingNotesCount = await Document.countDocuments({
        subject: subject._id,
        category: 'notes',
      });

      if (existingNotesCount >= 5) {
        return res.status(409).json({
          success: false,
          quotaExceeded: true,
          category: 'notes',
          message:
            '5 notes already exist for this subject. Please delete an older note before uploading a new one.',
        });
      }
    }

    // 2. UNIT-WISE PYQ & SYLLABUS: Maximum 1 per subject (Replace Conflict Modal)
    if (category === 'unitwise' || category === 'syllabus') {
      const existingDoc = await Document.findOne({
        subject: subject._id,
        category,
      });

      if (existingDoc) {
        // If client has not explicitly sent confirmation to replace the existing file
        if (
          !replaceExistingId ||
          replaceExistingId.toString() !== existingDoc._id.toString()
        ) {
          return res.status(409).json({
            success: false,
            conflict: true,
            category,
            existingDocId: existingDoc._id,
            existingDocTitle: existingDoc.title,
            existingDocUrl: existingDoc.fileUrl,
            message: `A ${
              category === 'unitwise' ? 'Unit-wise PYQ' : 'Syllabus'
            } already exists for this subject. Would you like to review and replace it?`,
          });
        }

        // If replacement is confirmed by client, delete the existing Cloudinary asset & DB record
        if (existingDoc.publicId) {
          try {
            await cloudinary.uploader.destroy(existingDoc.publicId, {
              resource_type: 'raw',
            });
          } catch (err) {
            console.warn('Prior asset destruction warning:', err.message);
          }
        }
        await Document.findByIdAndDelete(existingDoc._id);
      }
    }

    // ----------------------------------------------------
    // C. BUFFER CONVERSION & CLOUDINARY UPLOAD
    // ----------------------------------------------------
    const isImageUpload = req.files.every((f) => f.mimetype.startsWith('image/'));
    const isPdfUpload =
      req.files.length === 1 && req.files[0].mimetype === 'application/pdf';

    if (!isImageUpload && !isPdfUpload) {
      return res.status(400).json({
        success: false,
        message: 'Upload either a single PDF document or image scans (JPG/PNG).',
      });
    }

    let finalPdfBuffer;
    if (isImageUpload) {
      finalPdfBuffer = await convertImagesToPdf(req.files.map((f) => f.buffer));
    } else {
      finalPdfBuffer = req.files[0].buffer;
    }

    const folderPath = `canreal/${category}/${subject.code || cleanCode}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: 'raw',
          format: 'pdf',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(finalPdfBuffer).pipe(stream);
    });

    // ----------------------------------------------------
    // D. ROLLING 10-PYQ FIFO PURGE (Year & Session Chronology)
    // ----------------------------------------------------
    if (category === 'pyq') {
      const existingPyqs = await Document.find({
        subject: subject._id,
        category: 'pyq',
      }).lean();

      // If count is at or exceeds 10, find and remove the chronologically oldest paper
      if (existingPyqs.length >= 10) {
        existingPyqs.sort((a, b) => {
          const yearA = a.academicYear || 0;
          const yearB = b.academicYear || 0;

          // 1. Smaller year is chronologically older
          if (yearA !== yearB) {
            return yearA - yearB;
          }

          // 2. In same year: Summer is May/June (1), Winter is Nov/Dec (2)
          const termRank = (term) =>
            term && term.toLowerCase() === 'summer' ? 1 : 2;
          const rankA = termRank(a.sessionTerm);
          const rankB = termRank(b.sessionTerm);

          if (rankA !== rankB) {
            return rankA - rankB;
          }

          // 3. Fallback: upload insertion timestamp
          return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const oldestPyq = existingPyqs[0];

        if (oldestPyq.publicId) {
          try {
            await cloudinary.uploader.destroy(oldestPyq.publicId, {
              resource_type: 'raw',
            });
          } catch (cloudErr) {
            console.warn('FIFO asset deletion warning:', cloudErr.message);
          }
        }

        await Document.findByIdAndDelete(oldestPyq._id);
      }
    }

    // ----------------------------------------------------
    // E. CREATE & COMMIT NEW DOCUMENT RECORD
    // ----------------------------------------------------
    const newDoc = await Document.create({
      title: title.trim(),
      category,
      subject: subject._id,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      uploadedBy: currentUser._id,
      academicYear: academicYear ? Number(academicYear) : undefined,
      sessionTerm: sessionTerm || undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Resource published successfully!',
      document: newDoc,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Upload failed: ' + error.message });
  }
});


// 4. DELETE /documents/:id (Admin Superpower + Scoped Ownership)
router.delete('/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const userRole = (currentUser.role || '').toLowerCase();

    const doc = await Document.findById(id).populate('uploadedBy');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const isAdmin = userRole === 'admin';
    const isOwner =
      doc.uploadedBy &&
      (doc.uploadedBy._id ? doc.uploadedBy._id.toString() : doc.uploadedBy.toString()) ===
        currentUser._id.toString();

    // Scoped teacher check: can delete if student was onboarded by this teacher
    const isTeacherOfStudent =
      userRole === 'teacher' &&
      doc.uploadedBy &&
      doc.uploadedBy.role === 'student' &&
      doc.uploadedBy.addedBy &&
      doc.uploadedBy.addedBy.toString() === currentUser._id.toString();

    // ADMIN OVERRIDE: Admin can delete ANY document regardless of who uploaded it
    if (!isAdmin && !isOwner && !isTeacherOfStudent) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You do not have authorization to delete this resource.',
      });
    }

    // Destroy physical asset on Cloudinary
    if (doc.publicId) {
      try {
        await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.warn('Cloudinary delete warning:', cloudErr.message);
      }
    }

    await Document.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully by administrator.',
    });
  } catch (error) {
    console.error('Delete Document Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;