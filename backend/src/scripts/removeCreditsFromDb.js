// scripts/removeCreditsFromDb.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/canreal";

async function removeCredits() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;

    // Use MongoDB native collection operation with $unset to delete the 'credits' field from all documents
    const result = await db.collection('subjects').updateMany(
      {},
      { $unset: { credits: "" } }
    );

    console.log(`Successfully removed 'credits' field from ${result.modifiedCount} subject(s) in MongoDB.`);
  } catch (err) {
    console.error('Failed to update subjects collection:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

removeCredits();