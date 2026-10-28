// utils/imageToPdf.js
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

/**
 * Optimizes and compresses an image buffer using Sharp.
 * Auto-orients mobile photos, resizes large camera resolutions, and applies JPEG compression.
 * @param {Buffer} buffer - Raw image buffer from multer
 * @returns {Promise<Buffer>} - Compressed JPEG buffer
 */
async function compressImage(buffer) {
  return await sharp(buffer)
    .rotate() // Auto-rotates phone photos based on EXIF orientation
    .resize({
      width: 1600,
      height: 2200,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 70, progressive: true })
    .toBuffer();
}

/**
 * Converts an array of multer image files into a single compressed multi-page PDF document.
 * @param {Array} files - Array of files from req.files (using multer.memoryStorage())
 * @returns {Promise<Buffer>} - Compressed raw PDF buffer ready for Cloudinary
 */
async function convertImagesToPdf(files) {
  // 1. Create a blank PDF document
  const pdfDoc = await PDFDocument.create();

  // 2. Loop through each uploaded photo
  for (const file of files) {
    // Only accept supported image mimetypes
    if (!file.mimetype.startsWith('image/')) {
      continue;
    }

    try {
      // Compress and transcode to JPEG buffer
      const optimizedJpgBuffer = await compressImage(file.buffer);

      // Embed into PDF as JPEG
      const embeddedImage = await pdfDoc.embedJpg(optimizedJpgBuffer);

      // 3. Add a page matching the compressed image dimensions
      const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);

      // 4. Draw the image onto the entire page
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height
      });
    } catch (err) {
      console.warn(`⚠️ Skipped corrupt or unreadable image frame: ${err.message}`);
    }
  }

  // 5. Save and return the combined PDF as a Node.js Buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { convertImagesToPdf };