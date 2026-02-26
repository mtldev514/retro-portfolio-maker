/**
 * Translation Routes
 * GET/POST /api/translations/:lang — Read/write language JSON files
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();

router.get('/:lang', async (req, res) => {
  try {
    const langDir = process.env.LANG_DIR || path.join(process.cwd(), 'lang');
    const langFile = path.join(langDir, `${req.params.lang}.json`);

    if (!(await fs.pathExists(langFile))) {
      return res.json({});
    }

    const data = await fs.readJson(langFile);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:lang', async (req, res) => {
  try {
    const langDir = process.env.LANG_DIR || path.join(process.cwd(), 'lang');
    const langFile = path.join(langDir, `${req.params.lang}.json`);

    await fs.writeFile(langFile, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
