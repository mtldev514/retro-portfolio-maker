/**
 * Upload Routes (factory pattern)
 * POST /api/upload — single file upload
 * POST /api/upload-bulk — bulk file upload (indexed fields)
 *
 * Exports a factory function that receives a multer instance,
 * since the parent app configures the upload directory.
 */

const express = require('express');
const fs = require('fs-extra');
const manager = require('../lib/manager');

/**
 * Create upload router with the given multer instance
 * @param {import('multer').Multer} upload - configured multer instance
 * @returns {express.Router}
 */
function createUploadRouter(upload) {
  const router = express.Router();

  /**
   * POST /api/upload — Upload a single file with metadata
   * Expects multipart/form-data: file, title, category, medium?, genre?, description?, created?
   */
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file part' });
      }

      const { title, category, medium, genre, description, created } = req.body;

      if (!title || !category) {
        return res.status(400).json({ error: 'Title and Category are required' });
      }

      const result = await manager.uploadAndSave(req.file.path, title, category, {
        medium, genre, description, created,
      });

      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    } finally {
      // Cleanup temp file
      if (req.file && req.file.path) {
        fs.remove(req.file.path).catch(() => {});
      }
    }
  });

  /**
   * POST /api/upload-bulk — Upload multiple files with indexed metadata
   * Expects multipart/form-data: file_0, title_0, category_0, ..., file_1, title_1, ...
   */
  router.post('/upload-bulk', upload.any(), async (req, res) => {
    const results = [];
    const errors = [];

    // Find all file keys and sort by index
    const files = (req.files || []).slice().sort((a, b) => {
      const idxA = parseInt(a.fieldname.split('_')[1], 10);
      const idxB = parseInt(b.fieldname.split('_')[1], 10);
      return idxA - idxB;
    });

    for (const file of files) {
      const idx = file.fieldname.split('_')[1];
      const title = req.body[`title_${idx}`] || file.originalname;
      const category = req.body[`category_${idx}`];
      const medium = req.body[`medium_${idx}`];
      const genre = req.body[`genre_${idx}`];
      const description = req.body[`description_${idx}`];
      const created = req.body[`created_${idx}`];

      if (!category) {
        errors.push({ file: file.originalname, error: 'Missing category' });
        continue;
      }

      try {
        const result = await manager.uploadAndSave(file.path, title, category, {
          medium, genre, description, created,
        });
        results.push({ file: file.originalname, success: true, data: result });
      } catch (e) {
        errors.push({ file: file.originalname, error: e.message });
      } finally {
        fs.remove(file.path).catch(() => {});
      }
    }

    res.json({
      uploaded: results.length,
      failed: errors.length,
      results,
      errors,
    });
  });

  return router;
}

module.exports = createUploadRouter;
