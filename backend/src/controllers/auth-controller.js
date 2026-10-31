// backend/src/controllers/auth-controller.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import streamifier from 'streamifier';
import User from '../models/user-model.js';
import Otp from '../models/otp-model.js';
import UserInvite from '../models/userInvite-model.js';
import cloudinary from '../config/cloudinary-config.js';
import transporter from '../utils/mailer.js';

export const setAuthCookie = (res, user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

export const uploadAvatarToCloudinary = (buffer) => {
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

// POST /auth/register
export const register = async (req, res) => {
  try {
    let { email, mobileNumber, password, enrollmentNumber, otp } = req.body;
    email = (email || '').trim().toLowerCase();
    mobileNumber = (mobileNumber || '').trim();
    password = (password || '').trim();
    enrollmentNumber = (enrollmentNumber || '').trim().toUpperCase();
    otp = (otp || '').trim();

    if (!email || !mobileNumber || !password || !otp) {
      return res.status(400).json({ success: false, message: "Please enter all the details" })
    }

    const invite = await UserInvite.findOne({ email, isUsed: false });

    if (!invite) {
      return res.status(403).json({ success: false, message: "Email is not pre-approved" })
    }

    if (invite.targetRole === 'student' && !enrollmentNumber) {
      return res.status(400).json({ success: false, message: "Please enter admission year and enrollment number" })
    }

    if (invite.targetRole === 'student' && (enrollmentNumber !== invite.enrollmentNumber)) {
      return res.status(403).json({ success: false, message: "Enrollment number does not match your pre-approved invite!" })
    }

    const duplicateCheck =
      invite.targetRole === 'student'
        ? { $or: [{ email }, { enrollmentNumber }, { mobileNumber }] }
        : { $or: [{ email }, { mobileNumber }] };

    if (await User.findOne(duplicateCheck)) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email, mobile number or enrollment number already exists.',
      });
    }

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "This OTP is expired please try again." })
    }

    if (otp !== otpRecord.otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP!" })
    }

    let avatarUrl = '';
    let avatarPublicId = '';
    if (req.file) {
      const cloudRes = await uploadAvatarToCloudinary(req.file.buffer);
      avatarUrl = cloudRes.secure_url;
      avatarPublicId = cloudRes.public_id;
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const newUser = await User.create({
      name: invite.name,
      role: invite.targetRole,
      mobileNumber,
      email,
      enrollmentNumber: invite.targetRole === 'student' ? enrollmentNumber : undefined,
      password,
      admissionYear: invite.targetRole === 'student' ? 2000 + Number(enrollmentNumber.slice(6, 8)) : undefined,
    })

    invite.isUsed = true;
    invite.usedBy = newUser._id;
    await invite.save();

    const token = setAuthCookie(res, newUser);

    return res.status(200).json({
      success: true,
      message: `${newUser.role.toUpperCase()} registered successfully!`,
      token,
      name: newUser.name,
      role: newUser.role,
      mobileNumber: newUser.mobileNumber,
      email: newUser.email,
      enrollmentNumber: newUser.enrollmentNumber,
      admissionYear: newUser.admissionYear,
      currentYear: newUser.currentYear
    });

  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// POST /auth/login
export const login = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    identifier = identifier.trim();
    password = password.trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone/enrollment number and password.' });
    }
    
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() },
      { mobileNumber: identifier },
      { enrollmentNumber: identifier.toUpperCase() },],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
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
        enrollmentNumber: user.enrollmentNumber,
        admissionYear: user.admissionYear,
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
export const logout = (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

// POST /auth/send-otp
export const sendOtp = async (req, res) => {
  try {
    let { email, name } = req.body;
    email = (email || "").trim().toLowerCase();
    name = (name || "").trim();
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Valid email and name are required.'
      })
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in."
      })
    }
    const invitedUser = await UserInvite.findOne({ email, isUsed: false });
    if (!invitedUser) {
      return res.status(403).json({
        success: false,
        message: "This email has not been authorized by a faculty member or admin yet."
      });
    }

    const greeting = `Hello ${name.trim()}`;
    const otp = crypto.randomInt(100000, 999999).toString();

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });
    await transporter.sendMail({
      from: `"CanReal Auth" <${process.env.EMAIL_FROM}>`,
      to: email,
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

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully!',
      targetRole: invitedUser.targetRole,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP.',
    });
  }
};

export const inviteUser = async (req, res) => {
  try {
    let { email, targetRole, enrollmentNumber, name } = req.body;
    email = (email || '').trim().toLowerCase();
    targetRole = (targetRole || '').trim().toLowerCase();
    enrollmentNumber = (enrollmentNumber || '').trim().toUpperCase();

    if (!name) {
      return res.status(400).json({ success: false, message: "Please enter a name" })
    }

    if (!email || !['student', 'teacher'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email and targetRole (student or teacher) are required.',
      });
    }

    if (targetRole === 'student' && !enrollmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number is required when inviting a student.',
      });
    }

    const duplicateCheck =
      targetRole === 'student'
        ? { $or: [{ email }, { enrollmentNumber }] }
        : { email };

    if (await User.findOne(duplicateCheck)) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or enrollment number already exists.',
      });
    }

    const newInvite = await UserInvite.findOneAndUpdate(
      { email },
      {
        email,
        targetRole,
        enrollmentNumber: targetRole === 'student' ? enrollmentNumber : null,
        createdBy: req.user._id,
        isUsed: false,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `${email} has been pre-approved as a ${targetRole}!`,
      invite: newInvite,
    });
  } catch (error) {
    console.error('Invite User Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user, // verifyUser middleware already fetched this from MongoDB!
  });
};