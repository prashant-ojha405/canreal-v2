// scripts/resetAllUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('../models/teachers');
const Document = require('../models/documents');
const Otp = require('../models/otp');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/canreal";

async function resetAllUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database.');

    // 1. Delete all user accounts across every role
    const deletedUsers = await Teacher.deleteMany({});
    console.log(`Deleted ${deletedUsers.deletedCount} user account(s) (Students, Teachers, Admins).`);

    // 2. Clear any pending/expired OTP records
    const deletedOtps = await Otp.deleteMany({});
    console.log(`Cleared ${deletedOtps.deletedCount} OTP record(s).`);

    // 3. Unset uploadedBy on existing documents so no invalid IDs remain
    const updatedDocs = await Document.updateMany({}, { $unset: { uploadedBy: "" } });
    console.log(`Reset uploader references on ${updatedDocs.modifiedCount} document(s).`);

    // 4. Verify preserved items
    const pyqCount = await Document.countDocuments();
    console.log(`Preserved ${pyqCount} document(s) in the database.`);

    console.log('\nAll emails, mobile numbers, and accounts are completely reset and ready for clean registration.');
  } catch (err) {
    console.error('Reset failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

resetAllUsers();