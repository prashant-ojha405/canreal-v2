// backend/scripts/cleanCourses.js
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/courses');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/canreal';

async function clean() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Remove the obsolete generic Pharmacy record
    const result = await Course.deleteOne({ name: 'Pharmacy' });
    console.log(`Deleted ${result.deletedCount} old Pharmacy document.`);

    // Check active list
    const active = await Course.find({}, 'name totalSemesters').lean();
    console.log('Active Courses:', active);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

clean();