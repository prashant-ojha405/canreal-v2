// backend/controllers/dashboard.js
const Teacher = require('../models/teachers');
const Document = require('../models/documents');
const Settings = require('../models/settings');
const InviteToken = require('../models/inviteToken');
const Report = require('../models/report');
const cloudinary = require('../config/cloudinary');

// ----------------------------------------------------
// 1. STUDENT DASHBOARD
// ----------------------------------------------------
exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;

    const studentUser = await Teacher.findById(req.user._id)
    .populate('addedBy', 'name email role avatarUrl mobileNumber')
    .lean();

    const myUploads = await Document.find({ uploadedBy: studentId })
      .populate('subject')
      .sort({ createdAt: -1 })
      .lean();

    const myReports = await Report.find({ uploader: studentId, status: 'pending' })
      .populate('document', 'title category')
      .sort({ createdAt: -1 })
      .lean();

    const peerStudents = await Teacher.find({
      role: 'student',
      _id: { $ne: studentId },
    })
      .select('name email admissionYear avatarUrl')
      .lean();

    const peerIds = peerStudents.map((s) => s._id);
    const peerUploads = await Document.find({ uploadedBy: { $in: peerIds } })
      .populate('subject')
      .populate('uploadedBy', 'name avatarUrl role')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          name: req.user.name,
          email: req.user.email,
          avatarUrl: req.user.avatarUrl,
          currentYear: req.user.currentYear,
        },
        myUploads,
        notifications: myReports,
        peers: peerStudents.map((peer) => ({
          ...peer,
          documents: peerUploads.filter(
            (d) => d.uploadedBy && d.uploadedBy._id.toString() === peer._id.toString()
          ),
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// 2. TEACHER DASHBOARD
// ----------------------------------------------------
exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const myActiveTokens = await InviteToken.find({
      createdBy: teacherId,
      isUsed: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    const peopleAdded = await Teacher.find({ addedBy: teacherId })
      .select('name email mobileNumber role avatarUrl admissionYear createdAt')
      .lean();

    const studentIds = peopleAdded
      .filter((u) => u.role === 'student')
      .map((u) => u._id);

    // Mapped student uploads
    const studentUploads = await Document.find({ uploadedBy: { $in: studentIds } })
      .populate('subject')
      .populate('uploadedBy', 'name role avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    // Teacher's own uploads
    const myUploads = await Document.find({ uploadedBy: teacherId })
      .populate('subject')
      .sort({ createdAt: -1 })
      .lean();

    const relevantUploaderIds = [teacherId, ...studentIds];
    const pendingReports = await Report.find({
      uploader: { $in: relevantUploaderIds },
      status: 'pending',
    })
      .populate('document', 'title category fileUrl')
      .populate('uploader', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          avatarUrl: req.user.avatarUrl,
        },
        activeTokens: myActiveTokens,
        pendingReports,
        peopleAdded: peopleAdded.map((person) => ({
          ...person,
          uploads: studentUploads.filter(
            (d) => d.uploadedBy && d.uploadedBy._id.toString() === person._id.toString()
          ),
        })),
        myUploads,
        studentUploads,
      },
    });
  } catch (error) {
    console.error('Teacher Dashboard Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// 3. ADMIN DASHBOARD
// ----------------------------------------------------
exports.getAdminDashboard = async (req, res) => {
  try {
    const [teachers, students, documents, totalSubjects, pendingReports] = await Promise.all([
      Teacher.find({ role: 'teacher' })
        .populate('addedBy', 'name role email')
        .select('-password')
        .lean(),
      Teacher.find({ role: 'student' })
        .populate('addedBy', 'name role email')
        .select('-password')
        .lean(),
      Document.find()
        .populate('subject')
        .populate('uploadedBy', 'name role email avatarUrl addedBy')
        .sort({ createdAt: -1 })
        .lean(),
      Document.distinct('subject'),
      Report.find({ status: 'pending' })
        .populate('document', 'title category fileUrl')
        .populate('uploader', 'name email role')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const populateUserMeta = (user) => {
      const userUploads = documents.filter((d) => {
        if (!d.uploadedBy) return false;
        const uploaderId = d.uploadedBy._id ? d.uploadedBy._id.toString() : d.uploadedBy.toString();
        return uploaderId === user._id.toString();
      });
      return {
        ...user,
        uploadCount: userUploads.length,
        uploads: userUploads,
      };
    };

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalTeachers: teachers.length,
          totalStudents: students.length,
          totalDocuments: documents.length,
          subjectsCovered: totalSubjects.length,
          pendingReportsCount: pendingReports.length,
        },
        teachers: teachers.map(populateUserMeta),
        students: students.map(populateUserMeta),
        recentDocuments: documents,
        pendingReports,
      },
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// 4. UPDATE STUDENT PASSKEY
// ----------------------------------------------------
exports.updateStudentPasskey = async (req, res) => {
  try {
    const { newPasskey } = req.body;
    if (!newPasskey || !newPasskey.trim()) {
      return res.status(400).json({ success: false, message: 'New passkey is required.' });
    }
    const updated = await Settings.findOneAndUpdate(
      { key: 'student_passkey' },
      { value: newPasskey.trim() },
      { returnDocument: 'after', upsert: true }
    );
    return res.status(200).json({
      success: true,
      message: 'Student passkey successfully updated.',
      studentPasskey: updated.value,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// 5. USER REMOVAL (ADMIN OVERRIDE)
exports.removeUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const currentRole = (currentUser.role || '').toLowerCase();

    const targetUser = await Teacher.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    const isAdmin = currentRole === 'admin';
    const isTeacher = currentRole === 'teacher';

    // Prevent removing your own active account accidentally
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own active administrator account from this directory.',
      });
    }

    // Teachers can only remove students they personally onboarded
    if (isTeacher) {
      if (targetUser.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Teachers can only remove student accounts.' });
      }
      if (!targetUser.addedBy || targetUser.addedBy.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only remove students you personally onboarded.',
        });
      }
    }

    // If not admin and not the authorized teacher, deny access
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    // 1. Clean up all uploaded Cloudinary assets belonging to targetUser
    const userDocs = await Document.find({ uploadedBy: targetUser._id });
    for (const doc of userDocs) {
      if (doc.publicId) {
        try {
          await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'raw' });
        } catch (err) {
          console.warn(`Cloudinary asset deletion skipped: ${err.message}`);
        }
      }
    }

    // 2. Cascade delete database records
    await Document.deleteMany({ uploadedBy: targetUser._id });
    await Report.deleteMany({ uploader: targetUser._id });

    // 3. Remove Avatar from Cloudinary if stored
    if (targetUser.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(targetUser.avatarPublicId, { resource_type: 'image' });
      } catch (err) {
        console.warn(`Avatar removal warning: ${err.message}`);
      }
    }

    // 4. Delete the User Record
    await Teacher.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Account "${targetUser.name}" (${targetUser.role}) and all ${userDocs.length} associated uploads were permanently purged.`,
    });
  } catch (error) {
    console.error('Remove User Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};