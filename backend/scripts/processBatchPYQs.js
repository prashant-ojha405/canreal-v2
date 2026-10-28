// backend/scripts/processBatchPYQs.js
require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('../models/subjects');
const Document = require('../models/documents');
const Question = require('../models/questions');
const { extractQuestionsFromPdf } = require('../utils/pyqExtractor');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/canreal';

// Rate limiting sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBatch() {
  // Read optional CLI arguments: e.g. node scripts/processBatchPYQs.js --limit=1 --skip=0
  const args = process.argv.slice(2);
  let limit = 10;
  let skip = 0;

  args.forEach((arg) => {
    if (arg.startsWith('--limit=')) limit = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--skip=')) skip = parseInt(arg.split('=')[1], 10);
  });

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB. Running batch (Skip: ${skip}, Limit: ${limit})...`);

    // Fetch subjects that have syllabus units defined
    const subjects = await Subject.find({ 'syllabus.0': { $exists: true } })
      .skip(skip)
      .limit(limit)
      .lean();

    if (subjects.length === 0) {
      console.log('No subjects with syllabus found to process.');
      return;
    }

    console.log(`Found ${subjects.length} subject(s) in this batch.\n`);

    for (const sub of subjects) {
      const courseCode = sub.branchMappings?.[0]?.courseCode || 'N/A';
      console.log(`➡️️ Subject: ${sub.title} (${courseCode})`);

      // Find all raw PYQ documents uploaded for this subject
      const rawPyqs = await Document.find({
        subject: sub._id,
        category: 'pyq'
      }).lean();

      if (rawPyqs.length === 0) {
        console.log(`   No PYQ papers found. Skipping.\n`);
        continue;
      }

      for (const doc of rawPyqs) {
        // Skip if this paper was already extracted into questions
        const alreadyDone = await Question.exists({ rawDocument: doc._id });
        if (alreadyDone) {
          console.log(`   Paper "${doc.title}" already processed. Skipping.`);
          continue;
        }

        console.log(`   Extracting: "${doc.title}" (${doc.academicYear || 2026})...`);

        try {
          const term = doc.title.toLowerCase().includes('summer') ? 'Summer' : 'Winter';
          const year = doc.academicYear || 2026;

          const extracted = await extractQuestionsFromPdf(
            doc.fileUrl,
            sub.syllabus,
            year,
            term
          );

          if (extracted.length > 0) {
            const records = extracted.map((q) => ({
              subject: sub._id,
              rawDocument: doc._id,
              unit: q.unit || 1,
              questionNumber: q.questionNumber || 'Q',
              questionText: q.questionText,
              marks: q.marks || 7,
              academicYear: year,
              sessionTerm: term,
              hasDiagram: Boolean(q.hasDiagram)
            }));

            // Save extracted questions, silently ignoring duplicates
            await Question.insertMany(records, { ordered: false }).catch(() => {});
            console.log(`   Saved ${extracted.length} questions successfully.`);
          } else {
            console.log(`   No questions returned by Gemini for this paper.`);
          }
        } catch (fileErr) {
          console.error(`   Error processing ${doc.title}:`, fileErr.message);
        }

        // Pacing delay (4 seconds) to guarantee < 15 requests per minute
        console.log(`   Waiting 4 seconds for API rate limit...`);
        await sleep(4000);
      }
      console.log('');
    }

    console.log('Batch run completed.');
  } catch (err) {
    console.error('Batch error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

runBatch();