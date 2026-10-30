// backend/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from '../models/user-model.js';

// Unified authentication verification
const verifyUser = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    const handleUnauthorized = (message) => {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, message });
      }
      return res.redirect('/auth/login');
    };

    if (!token) {
      return handleUnauthorized('Access denied. Please log in.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_123');
    const userId = decoded.id || decoded.teacherId;
    const user = await Teacher.findById(userId);
    if (!user) {
      return handleUnauthorized('User no longer exists.');
    }

    // Attach user to request
    req.user = user;
    req.teacher = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }
    return res.redirect('/auth/login');
  }
};

// Role authorization guard: case-insensitive & allows admins everywhere
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User not authenticated.',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (userRole === 'admin' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied. Requires role: [${allowedRoles.join(', ')}].`,
    });
  };
};

module.exports = {
  verifyUser,
  verifyTeacher: verifyUser,
  authorizeRoles,
};