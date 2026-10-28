// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getTeacherDashboard,
  updateStudentPasskey,
  getAdminDashboard,
  removeUser
} = require('../controllers/dashboard');
const { verifyUser, authorizeRoles } = require('../middleware/auth');

// 1. Render HTML Templates for Browser Access
router.get('/student', verifyUser, authorizeRoles('student'), (req, res) => {
  res.render('dashboard/student', { user: req.user });
});
router.get('/teacher', verifyUser, authorizeRoles('teacher'), (req, res) => {
  res.render('dashboard/teacher', { user: req.user });
});
router.get('/admin', verifyUser, authorizeRoles('admin'), (req, res) => {
  res.render('dashboard/admin', { user: req.user });
});

// 2. JSON API Data Endpoints (Fetched via client-side fetch())
router.get('/api/student', verifyUser, authorizeRoles('student'), getStudentDashboard);
router.get('/api/teacher', verifyUser, authorizeRoles('teacher'), getTeacherDashboard);
router.get('/api/admin', verifyUser, authorizeRoles('admin'), getAdminDashboard);

// 3. Teacher Actions
router.patch('/teacher/student-passkey', verifyUser, authorizeRoles('teacher', 'admin'), updateStudentPasskey);

// 4. Remove User Endpoint (Hierarchy enforced in controller)
router.delete('/users/:id', verifyUser, authorizeRoles('teacher', 'admin'), removeUser);

module.exports = router;