/**
 * Config Routes
 * GET/POST /api/config/:name — Read/write config JSON files
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { config } = require('../lib/config-loader');

const router = express.Router();

router.get('/:name', async (req, res) => {
  try {
    const configDir = process.env.CONFIG_DIR || path.join(process.cwd(), 'config');
    const configFile = path.join(configDir, `${req.params.name}.json`);

    if (!(await fs.pathExists(configFile))) {
      return res.json({});
    }

    const data = await fs.readJson(configFile);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:name', async (req, res) => {
  try {
    const configDir = process.env.CONFIG_DIR || path.join(process.cwd(), 'config');
    const configFile = path.join(configDir, `${req.params.name}.json`);

    await fs.writeFile(configFile, JSON.stringify(req.body, null, 2), 'utf-8');

    // Reload config after save
    config.loadAll();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
