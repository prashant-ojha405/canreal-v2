// backend/scripts/seedCourses.js
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/courses');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/canreal';

const initialCourses = [
  {
    name: 'B.Tech',
    totalSemesters: 8,
    branches: [
      { name: '1st Year (Common)', code: 'COMMON' },
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'AI & Machine Learning', code: 'AIML' },
      { name: 'AI & Data Science', code: 'AIDS' }
    ]
  },
  {
    name: 'B.Pharmacy',
    totalSemesters: 8,
    branches: [
      { name: 'Pharmacy (General)', code: 'PHARMACY' }
    ]
  },
  {
    name: 'D.Pharmacy',
    totalSemesters: 4,
    branches: [
      { name: 'Pharmacy (Diploma)', code: 'DPHARM' }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Upsert each course so existing courses are updated without deleting others
    for (const c of initialCourses) {
      await Course.findOneAndUpdate(
        { name: c.name },
        { $set: c },
        { upsert: true, new: true }
      );
    }

    console.log('Courses seeded/updated safely without deleting other records!');
  } catch (err) {
    console.error('Seeding error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();