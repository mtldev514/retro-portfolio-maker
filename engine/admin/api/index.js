/**
 * Admin API — Express Server
 *
 * Provides REST API for portfolio content management:
 * uploads, content CRUD, config, translations, styles,
 * GitHub sync, and git commit/push.
 *
 * Supports two modes (detected from config-source.json):
 *   - "local"    → JsonFileStore + Cloudinary (legacy)
 *   - "supabase" → SupabaseStore + Supabase Storage
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { config } = require('./lib/config-loader');
const { JsonFileStore } = require('./lib/data-store');
const manager = require('./lib/manager');

// Route modules
const createUploadRouter = require('./routes/upload');
const createContentRouter = require('./routes/content');
const createConfigRouter = require('./routes/config');
const createTranslationsRouter = require('./routes/translations');
const stylesRoutes = require('./routes/styles');
const integrationsRoutes = require('./routes/integrations');

/**
 * Detect data source mode from config-source.json in the project directory.
 * Returns "local" (default) or "supabase".
 * @param {string} projectDir — absolute path to the user's project
 * @returns {string} mode
 */
function detectMode(projectDir) {
  const possiblePaths = [
    path.join(projectDir, 'config-source.json'),
    path.join(projectDir, 'config', 'config-source.json'),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readJsonSync(filePath);
        if (data.mode === 'supabase') return 'supabase';
      }
    } catch {
      // Ignore read errors, fall through to default
    }
  }

  return 'local';
}

/**
 * Create and configure the Express app
 * @param {object} [options]
 * @param {object} [options.store] — DataStore instance (JsonFileStore or SupabaseStore)
 * @param {string} [options.uploadDir] — temp upload directory
 * @param {string} [options.mode='local'] — 'local' or 'supabase'
 */
function createApp(options = {}) {
  const app = express();
  const appMode = options.mode || 'local';

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Configure multer for file uploads
  const uploadDir = options.uploadDir || 'temp_uploads';
  fs.ensureDirSync(uploadDir);

  const upload = multer({ dest: uploadDir });

  // Create DataStore (from options or config singleton)
  const store = options.store || new JsonFileStore(config);

  // Build route options for mode-aware routers
  const routeOpts = { mode: appMode };

  if (appMode === 'supabase') {
    // Lazy getter — only creates the Supabase client when actually called
    const { getSupabaseClient } = require('./lib/supabase-client');
    routeOpts.getSupabase = getSupabaseClient;
  }

  // Mount upload routes (factory receives multer instance)
  app.use('/api', createUploadRouter(upload));

  // Mount content routes (factory receives DataStore — transparent)
  app.use('/api/content', createContentRouter(store));

  // Mount config + translations routes (factory receives mode opts)
  app.use('/api/config', createConfigRouter(routeOpts));
  app.use('/api/translations', createTranslationsRouter(routeOpts));

  app.use('/api/styles', stylesRoutes);
  app.use('/api', integrationsRoutes);

  return app;
}

/**
 * Start the admin API server
 * Called by scripts/admin.js
 */
function startServer(options = {}) {
  const dirs = options.dirs || {};

  // Set env vars from options (admin.js passes these)
  if (dirs.data) process.env.DATA_DIR = dirs.data;
  if (dirs.config) process.env.CONFIG_DIR = dirs.config;
  if (dirs.lang) process.env.LANG_DIR = dirs.lang;
  if (dirs.styles) process.env.STYLES_DIR = dirs.styles;
  if (dirs.project) process.env.PROJECT_DIR = dirs.project;

  const port = options.port || process.env.PORT || 5001;

  // Load .env from user's project directory
  const projectDir = dirs.project || process.cwd();
  const envPath = path.join(projectDir, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }

  // Configure config loader with user directories
  config.setDirs({
    configDir: process.env.CONFIG_DIR,
    dataDir: process.env.DATA_DIR,
    langDir: process.env.LANG_DIR,
  });
  config.loadAll();

  // ─── Mode Detection ─────────────────────────────────────
  const sourceMode = detectMode(projectDir);

  // Create the appropriate DataStore
  let store;
  if (sourceMode === 'supabase') {
    const { SupabaseStore } = require('./lib/supabase-store');
    store = new SupabaseStore(config);
    console.log('📦 Data store: Supabase DB');
  } else {
    store = new JsonFileStore(config);
    console.log('📦 Data store: Local JSON files');
  }

  // Initialize manager with store and mode
  manager.init(store, { mode: sourceMode });

  // Create and start server
  const app = createApp({
    store,
    uploadDir: path.join(projectDir, 'temp_uploads'),
    mode: sourceMode,
  });

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🔧 Admin API starting...`);
    console.log(`   Mode: ${sourceMode}`);
    console.log(`   Data dir: ${path.resolve(process.env.DATA_DIR || 'data')}`);
    console.log(`   Config dir: ${path.resolve(process.env.CONFIG_DIR || 'config')}`);
    console.log(`   Lang dir: ${path.resolve(process.env.LANG_DIR || 'lang')}`);
    console.log(`   Styles dir: ${path.resolve(process.env.STYLES_DIR || 'styles')}`);
    console.log(`   API Port: ${port}`);
    console.log(`\n✨ Admin API ready at: http://localhost:${port}/api/\n`);
  });

  return server;
}

module.exports = { createApp, startServer, detectMode };
