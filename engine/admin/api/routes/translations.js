/**
 * Translation Routes (Factory)
 * GET/POST /api/translations/:lang — Read/write language JSON files or Supabase translations table
 *
 * In local mode:    reads/writes lang/*.json files (existing behavior)
 * In supabase mode: reads/writes the `translations` table (lang_code → data JSONB)
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');

/**
 * Create translations router with mode-aware branching.
 * @param {object} [opts]
 * @param {string} [opts.mode='local'] — 'local' or 'supabase'
 * @param {function} [opts.getSupabase] — lazy getter for Supabase client
 */
module.exports = function createTranslationsRouter(opts = {}) {
  const router = express.Router();
  const routeMode = opts.mode || 'local';

  router.get('/:lang', async (req, res) => {
    try {
      if (routeMode === 'supabase') {
        // ─── Supabase: read from translations table ───
        const supabase = opts.getSupabase();
        const { data, error } = await supabase
          .from('translations')
          .select('data')
          .eq('lang_code', req.params.lang)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return res.json((data && data.data) || {});
      }

      // ─── Local: read from lang/*.json file ───
      const langDir = process.env.LANG_DIR || path.join(process.cwd(), 'lang');
      const langFile = path.join(langDir, `${req.params.lang}.json`);

      if (!(await fs.pathExists(langFile))) {
        return res.json({});
      }

      const fileData = await fs.readJson(langFile);
      res.json(fileData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/:lang', async (req, res) => {
    try {
      if (routeMode === 'supabase') {
        // ─── Supabase: upsert into translations table ───
        const supabase = opts.getSupabase();
        const { error } = await supabase
          .from('translations')
          .upsert(
            {
              lang_code: req.params.lang,
              data: req.body,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'lang_code' }
          );

        if (error) throw new Error(error.message);
        return res.json({ success: true });
      }

      // ─── Local: write to lang/*.json file ───
      const langDir = process.env.LANG_DIR || path.join(process.cwd(), 'lang');
      const langFile = path.join(langDir, `${req.params.lang}.json`);

      await fs.writeFile(langFile, JSON.stringify(req.body, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
