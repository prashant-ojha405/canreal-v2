// backend/src/routes/auth.js
import express from 'express';
import multer from 'multer';
import { register, login, logout, sendOtp, inviteUser } from '../controllers/auth.js';
import { verifyUser, authorizeRoles, authLimiter } from '../middleware/auth.js';

const router = express.Router();

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

router.post("/send-otp", authLimiter, sendOtp)
router.post("/register", authLimiter, upload.single('avatar'), register);
router.post("/login", authLimiter, login);
router.get('/me', verifyUser, getMe);
router.post("/logout", logout);
router.post("/invite-user", verifyUser, authorizeRoles('teacher', 'admin'), inviteUser)

export default router;