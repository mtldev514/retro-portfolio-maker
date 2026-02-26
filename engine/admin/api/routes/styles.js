/**
 * Styles Routes
 * GET/POST /api/styles — Read/write theme registry (styles.json)
 * GET /api/styles/themes — List CSS theme files
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();

// GET /api/styles/themes MUST be before GET /api/styles to avoid conflict
router.get('/themes', async (req, res) => {
  try {
    const stylesDir = process.env.STYLES_DIR || path.join(process.cwd(), 'styles');

    if (!(await fs.pathExists(stylesDir))) {
      return res.json({ files: [] });
    }

    const files = (await fs.readdir(stylesDir))
      .filter(f => f.endsWith('.css'))
      .sort();

    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const stylesDir = process.env.STYLES_DIR || path.join(process.cwd(), 'styles');
    const stylesFile = path.join(stylesDir, 'styles.json');

    if (!(await fs.pathExists(stylesFile))) {
      return res.json({});
    }

    const data = await fs.readJson(stylesFile);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const stylesDir = process.env.STYLES_DIR || path.join(process.cwd(), 'styles');
    await fs.ensureDir(stylesDir);

    const stylesFile = path.join(stylesDir, 'styles.json');
    // Styles.json uses 4-space indent (matching Python behavior)
    await fs.writeFile(stylesFile, JSON.stringify(req.body, null, 4), 'utf-8');

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
