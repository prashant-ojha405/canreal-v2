// backend/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from '../models/user-model.js';

// Guard 1: Verify JWT & attach user to req.user
export const verifyUser = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header ("Bearer <token>") OR httpOnly cookie
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2. If no token found, block immediately
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in.',
      });
    }

    // 3. Verify token signature & expiration using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Fetch the live user from MongoDB (excluding their password hash)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer exists.',
      });
    }

    // 5. Attach user object to req so the controller knows who is logged in
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
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

