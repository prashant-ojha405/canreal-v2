// scripts/assignAdminToExistingDocs.js
require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('../models/teachers');
const Document = require('../models/documents');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/canreal";

async function updateExistingDocs() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Locate the registered Admin account
    const admin = await Teacher.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ Error: No Admin account found in database.');
      console.log('Please register an Admin account first via /auth/register before running this script.');
      return;
    }

    console.log(`Found Admin account: "${admin.name}" (${admin.email}) [ID: ${admin._id}]`);

    // 2. Assign admin._id to all documents where uploadedBy is unset, null, or missing
    const result = await Document.updateMany(
      {
        $or: [
          { uploadedBy: { $exists: false } },
          { uploadedBy: null }
        ]
      },
      { $set: { uploadedBy: admin._id } }
    );

    console.log(`\n Successfully linked ${result.modifiedCount} document(s) to Admin: "${admin.name}".`);
    
    // 3. Confirm total count of assigned documents
    const totalAssigned = await Document.countDocuments({ uploadedBy: admin._id });
    console.log(`Total documents now showing uploaded by this Admin: ${totalAssigned}`);

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

updateExistingDocs();