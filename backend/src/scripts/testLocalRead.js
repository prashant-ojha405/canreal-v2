// backend/scripts/testLocalRead.js
require('dotenv').config();
const pdfParse = require('pdf-parse');

console.log('--- EXPORT INSPECTION ---');
console.log('Type of pdfParse:', typeof pdfParse);
console.log('Keys on pdfParse:', Object.keys(pdfParse));

async function run() {
  try {
    // If it's a constructor or has a PDFParse class:
    if (pdfParse.PDFParser || pdfParse.PDFExtract || typeof pdfParse === 'function') {
      console.log('Available parser found.');
    }
  } catch (err) {
    console.error('Inspection error:', err.message);
  }
}

run();