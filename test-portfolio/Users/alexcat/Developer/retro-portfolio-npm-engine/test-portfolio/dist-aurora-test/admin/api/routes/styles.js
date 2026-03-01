/**
 * Styles Routes
 * GET/POST /api/styles — Read/write theme registry (styles.json)
 * GET /api/styles/themes — List CSS theme files
 * GET/POST /api/styles/tokens — Read/write design token overrides (theme.json)
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

// GET /api/styles/tokens — Read design token overrides (theme.json)
router.get('/tokens', async (req, res) => {
  try {
    const stylesDir = process.env.STYLES_DIR || path.join(process.cwd(), 'styles');
    const tokensFile = path.join(stylesDir, 'theme.json');

    if (!(await fs.pathExists(tokensFile))) {
      return res.json({ base: 'beton', overrides: {} });
    }

    const data = await fs.readJson(tokensFile);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/styles/tokens — Write design token overrides (theme.json)
router.post('/tokens', async (req, res) => {
  try {
    const stylesDir = process.env.STYLES_DIR || path.join(process.cwd(), 'styles');
    await fs.ensureDir(stylesDir);

    const data = req.body;
    if (!data.base || typeof data.base !== 'string') {
      return res.status(400).json({ error: 'Missing required field: base' });
    }
    if (data.overrides && typeof data.overrides !== 'object') {
      return res.status(400).json({ error: 'overrides must be an object' });
    }

    const tokensFile = path.join(stylesDir, 'theme.json');
    await fs.writeFile(tokensFile, JSON.stringify(data, null, 4), 'utf-8');
    res.json({ success: true });
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
