// scripts/addCourseToSubjects.js
require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('../models/subjects');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/canreal';

async function migrateCourses() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Target all subjects where at least one branchMapping has no course field
    const filter = {
      'branchMappings.course': { $exists: false }
    };

    // 2. Use MongoDB's $[ ] all-positional operator to populate 'course' in all inner elements
    const update = {
      $set: {
        'branchMappings.$[].course': 'B.tech'
      }
    };

    console.log('Running migration...');
    const result = await Subject.updateMany(filter, update);

    console.log(`\n Successfully updated ${result.modifiedCount} subject document(s).`);

    // 3. Verification check
    const sample = await Subject.findOne().lean();
    console.log('\nSample Subject Record:');
    console.log(JSON.stringify(sample.branchMappings, null, 2));

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
  }
}

migrateCourses();