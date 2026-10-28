// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const Document = require('../models/documents');
const { verifyUser } = require('../middleware/auth');

// 1. POST /reports/submit (Public or authenticated)
router.post('/submit', async (req, res) => {
  try {
    const { documentId, reason, additionalDetails } = req.body;
    if (!documentId || !reason) {
      return res.status(400).json({ success: false, message: 'Document ID and reason are required.' });
    }

    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Target document not found.' });
    }

    const newReport = await Report.create({
      document: doc._id,
      uploader: doc.uploadedBy,
      reportedBy: req.user ? req.user._id : null,
      reason,
      additionalDetails: additionalDetails ? additionalDetails.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted. The uploader has been notified to review the content.',
      reportId: newReport._id,
    });
  } catch (error) {
    console.error('Report submission error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. PATCH /reports/:id/resolve (Uploader or Admin marks report as resolved/dismissed)
router.patch('/:id/resolve', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'resolved' or 'dismissed'

    if (!['resolved', 'dismissed'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be resolved or dismissed.' });
    }

    const report = await Report.findById(id).populate('document');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const isUploader = report.uploader.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isUploader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    report.status = action;
    await report.save();

    return res.status(200).json({ success: true, message: `Report marked as ${action}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;