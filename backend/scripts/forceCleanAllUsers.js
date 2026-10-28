// scripts/forceCleanAllUsers.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/canreal";

async function forceWipeUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database.');

    const db = mongoose.connection.db;

    // 1. Check if 'teachers' collection exists and wipe it directly at the driver level
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (collectionNames.includes('teachers')) {
      const teacherCount = await db.collection('teachers').countDocuments();
      console.log(`Found ${teacherCount} record(s) in 'teachers' collection.`);
      const res = await db.collection('teachers').deleteMany({});
      console.log(`Deleted ${res.deletedCount} user(s) from 'teachers'.`);
    } else {
      console.log("No collection named 'teachers' found.");
    }

    // 2. Wipe OTP records
    if (collectionNames.includes('otps')) {
      const otpRes = await db.collection('otps').deleteMany({});
      console.log(`Cleared ${otpRes.deletedCount} OTP record(s).`);
    }

    // 3. Clear 'uploadedBy' reference from all documents so no dangling ObjectId remains
    if (collectionNames.includes('documents')) {
      const docRes = await db.collection('documents').updateMany(
        {},
        { $unset: { uploadedBy: "" } }
      );
      console.log(`Reset 'uploadedBy' field on ${docRes.modifiedCount} document(s).`);
      
      const remainingDocs = await db.collection('documents').countDocuments();
      console.log(`Preserved ${remainingDocs} seeded documents.`);
    }

    console.log('\nAll user accounts and credentials have been wiped from MongoDB.');
    console.log('Your mobile number and email are now clear for registration.');
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

forceWipeUsers();