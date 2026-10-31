// backend/src/routes/auth.js
import express from 'express';
import router from express.Router();
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth';
import { verifyUser, authorizeRoles } from '../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max avatar size
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Avatar must be an image file (JPG/PNG/WEBP).'), false);
    }
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.get('/register', authController.getRegisterPage);
router.get('/login', authController.getLoginPage);

// Registration with avatar file upload support
router.post('/register', authLimiter, upload.single('avatar'), authController.register);

router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/send-otp', authLimiter, authController.sendOtp);

// Route for teachers and admins to generate single-use invite OTPs
router.post(
  '/generate-invite-token',
  verifyUser,
  authorizeRoles('teacher', 'admin'),
  authController.generateInviteToken
);

module.exports = router;