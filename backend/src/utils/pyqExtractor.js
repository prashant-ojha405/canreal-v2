// backend/utils/pyqExtractor.js
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper: Download PDF from Cloudinary into a base64 string
async function getPdfBase64(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}

// Helper: Pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extracts and maps questions to units using Gemini Flash with retry handling.
 */
async function extractQuestionsFromPdf(pdfUrl, syllabus, academicYear, sessionTerm) {
  const base64Data = await getPdfBase64(pdfUrl);

  const syllabusSummary = syllabus
    .map((u) => `Unit ${u.unitNumber}: ${u.topics.join(', ')}`)
    .join('\n');

  const prompt = `
You are an expert academic exam analyzer for Indian university technical exams (RGPV pattern).
Analyze the attached question paper PDF and extract each question.

Subject Syllabus Units:
${syllabusSummary}

Rules:
1. Extract each individual question or sub-part (e.g. 1(a), 1(b), 2, 3(a), etc.).
2. Clean up university exam noise (ignore headers, roll number boxes, total marks instructions, or "OR" separators).
3. Map every question strictly to the single most relevant unit (1, 2, 3, 4, or 5) based on the syllabus.
4. Set "hasDiagram" to true ONLY IF the question relies on, shows, or references a figure, schematic, diagram, graph, or circuit.
5. Return ONLY a valid JSON array of objects.

JSON schema per item:
[
  {
    "questionNumber": "1(a)",
    "questionText": "Full question statement here...",
    "unit": 1,
    "marks": 7,
    "hasDiagram": false
  }
]
`;

  // Try standard flash models with automatic retry on 503 / rate limits
  const modelToUse = 'gemini-2.0-flash';
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text);
      return parsed.map((q) => ({
        ...q,
        academicYear,
        sessionTerm: sessionTerm || 'Winter'
      }));
    } catch (err) {
      const is503 = err.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE'));
      if (is503 && attempts < maxAttempts) {
        const delay = attempts * 5000;
        console.warn(`   ⚠️ Model busy (503). Retrying in ${delay / 1000}s (Attempt ${attempts}/${maxAttempts})...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }

  return [];
}

module.exports = { extractQuestionsFromPdf };