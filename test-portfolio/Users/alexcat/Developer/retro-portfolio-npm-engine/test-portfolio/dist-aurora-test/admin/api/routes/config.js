/**
 * Config Routes (Factory)
 * GET/POST /api/config/:name — Read/write config JSON files or Supabase config table
 *
 * In local mode:    reads/writes config/*.json files (existing behavior)
 * In supabase mode: reads/writes the `config` table (key → value JSONB)
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { config } = require('../lib/config-loader');

/**
 * Create config router with mode-aware branching.
 * @param {object} [opts]
 * @param {string} [opts.mode='local'] — 'local' or 'supabase'
 * @param {function} [opts.getSupabase] — lazy getter for Supabase client
 */
module.exports = function createConfigRouter(opts = {}) {
  const router = express.Router();
  const routeMode = opts.mode || 'local';

  /**
   * Resolve a safe file path inside a base directory.
   * Rejects any param that would escape the directory (path traversal).
   */
  function safeConfigPath(name) {
    const configDir = path.resolve(process.env.CONFIG_DIR || path.join(process.cwd(), 'config'));
    const filePath = path.resolve(configDir, `${name}.json`);
    if (!filePath.startsWith(configDir + path.sep)) return null;
    return filePath;
  }

  router.get('/:name', async (req, res) => {
    try {
      if (routeMode === 'supabase') {
        // ─── Supabase: read from config table ───
        const supabase = opts.getSupabase();
        const { data, error } = await supabase
          .from('config')
          .select('value')
          .eq('key', req.params.name)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return res.json((data && data.value) || {});
      }

      // ─── Local: read from config/*.json file ───
      const configFile = safeConfigPath(req.params.name);
      if (!configFile) return res.status(400).json({ error: 'Invalid config name' });

      if (!(await fs.pathExists(configFile))) {
        return res.json({});
      }

      const fileData = await fs.readJson(configFile);
      res.json(fileData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/:name', async (req, res) => {
    try {
      if (routeMode === 'supabase') {
        // ─── Supabase: upsert into config table ───
        const supabase = opts.getSupabase();
        const { error } = await supabase
          .from('config')
          .upsert(
            {
              key: req.params.name,
              value: req.body,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );

        if (error) throw new Error(error.message);

        // Reload in-memory config (keeps ConfigLoader in sync)
        config.loadAll();

        return res.json({ success: true });
      }

      // ─── Local: write to config/*.json file ───
      const configFile = safeConfigPath(req.params.name);
      if (!configFile) return res.status(400).json({ error: 'Invalid config name' });

      await fs.writeFile(configFile, JSON.stringify(req.body, null, 2), 'utf-8');

      // Reload config after save
      config.loadAll();

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
