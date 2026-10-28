// backend/controllers/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const streamifier = require('streamifier');
const Teacher = require('../models/teachers');
const Otp = require('../models/otp');
const InviteToken = require('../models/inviteToken');
const cloudinary = require('../config/cloudinary');
const transporter = require('../utils/mailer');

const setAuthCookie = (res, user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'fallback_secret_key_123',
    { expiresIn: '7d' }
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

const uploadAvatarToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'canreal/avatars',
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

exports.getForgotPasswordPage = (req, res) => res.render('users/forgot-password');
exports.getRegisterPage = (req, res) => res.render('users/register');
exports.getLoginPage = (req, res) => res.render('users/login');

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, mobileNumber, password, role, passkey, admissionYear, otp } = req.body;

    if (!name || !email || !mobileNumber || !password || !passkey || !role || !otp) {
      return res.status(400).json({
        success: false,
        message: 'All fields including email OTP and invite passkey are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify email OTP
    const otpRecord = await Otp.findOne({ email: normalizedEmail, otp: otp.trim() });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email OTP. Please request a new code.',
      });
    }

    const selectedRole = role.toLowerCase().trim();
    if (!['student', 'teacher', 'admin'].includes(selectedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });
    }

    // 2. Passkey / Single-Use Token Verification
    let inviterId = null;
    const cleanPasskey = passkey.trim();

    if (selectedRole === 'admin') {
      const adminSecret = process.env.ADMIN_REGISTRATION_PASSKEY || 'ADMIN_MASTER_CANREAL_2026';
      if (cleanPasskey !== adminSecret) {
        return res.status(403).json({ success: false, message: 'Invalid Admin master passkey.' });
      }
    } else {
      // Must match a single-use token created by an admin or teacher
      const invite = await InviteToken.findOne({
        token: cleanPasskey,
        targetRole: selectedRole,
        isUsed: false,
      });

      if (!invite) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or already-used invite OTP. Please request a new invite from faculty.',
        });
      }

      inviterId = invite.createdBy;
    }

    // 3. Uniqueness Check
    const cleanMobile = mobileNumber.trim();
    const existing = await Teacher.findOne({
      $or: [{ email: normalizedEmail }, { mobileNumber: cleanMobile }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or mobile number already exists.',
      });
    }

    // 4. Handle Avatar Upload if provided
    let avatarUrl = '';
    let avatarPublicId = '';
    if (req.file) {
      const cloudRes = await uploadAvatarToCloudinary(req.file.buffer);
      avatarUrl = cloudRes.secure_url;
      avatarPublicId = cloudRes.public_id;
    }

    // 5. Consume email OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // 6. Create User
    const newUser = await Teacher.create({
      name: name.trim(),
      email: normalizedEmail,
      mobileNumber: cleanMobile,
      password: password.trim(),
      role: selectedRole,
      avatarUrl,
      avatarPublicId,
      addedBy: inviterId,
      admissionYear: selectedRole === 'student' ? Number(admissionYear) : undefined,
    });

    // Mark single-use token as used
    if (inviterId) {
      await InviteToken.updateOne(
        { token: cleanPasskey },
        { isUsed: true, usedBy: newUser._id }
      );
    }

    const token = setAuthCookie(res, newUser);
    return res.status(201).json({
      success: true,
      message: `${selectedRole.toUpperCase()} registered and verified successfully!`,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl,
        currentYear: newUser.currentYear,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password.' });
    }

    const cleanIdentifier = identifier.trim();
    const user = await Teacher.findOne({
      $or: [{ email: cleanIdentifier.toLowerCase() }, { mobileNumber: cleanIdentifier }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password.trim());
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = setAuthCookie(res, user);
    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        currentYear: user.currentYear,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// POST /auth/logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

// POST /auth/send-otp
exports.sendOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const greeting = name ? `Hello ${name.trim()},` : 'Hello,';
    const otp = crypto.randomInt(100000, 999999).toString();

    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({ email: normalizedEmail, otp });

    await transporter.sendMail({
      from: `"CanReal Auth" <${process.env.EMAIL_FROM}>`,
      to: normalizedEmail,
      subject: 'Your CanReal Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">CanReal</h2>
          <p>${greeting}</p>
          <p>Your one-time email verification code is:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 16px;">Valid for 5 minutes. Do not share this code.</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// POST /auth/generate-invite-token (Teachers & Admins)
exports.generateInviteToken = async (req, res) => {
  try {
    const { targetRole } = req.body;
    if (!['student', 'teacher'].includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'Target role must be student or teacher.' });
    }

    // Generate random 8-digit token
    const token = crypto.randomInt(10000000, 99999999).toString();

    const invite = await InviteToken.create({
      token,
      createdBy: req.user._id,
      targetRole,
    });

    return res.status(201).json({
      success: true,
      message: `Single-use invite token for ${targetRole.toUpperCase()} generated!`,
      token: invite.token,
    });
  } catch (error) {
    console.error('Invite Token Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};