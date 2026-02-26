/**
 * Admin API — Express Server
 * Replaces Python Flask admin_api.py
 *
 * Provides REST API for portfolio content management:
 * uploads, content CRUD, config, translations, styles,
 * GitHub sync, and git commit/push.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { config } = require('./lib/config-loader');
const manager = require('./lib/manager');

// Route modules
const createUploadRouter = require('./routes/upload');
const contentRoutes = require('./routes/content');
const configRoutes = require('./routes/config');
const translationsRoutes = require('./routes/translations');
const stylesRoutes = require('./routes/styles');
const integrationsRoutes = require('./routes/integrations');

/**
 * Create and configure the Express app
 */
function createApp(options = {}) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Configure multer for file uploads
  const uploadDir = options.uploadDir || 'temp_uploads';
  fs.ensureDirSync(uploadDir);

  const upload = multer({ dest: uploadDir });

  // Mount upload routes (factory receives multer instance)
  app.use('/api', createUploadRouter(upload));

  // Mount other API routes
  app.use('/api/content', contentRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/translations', translationsRoutes);
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

  // Initialize manager (Cloudinary config, GitHub config, category map)
  manager.init();

  // Create and start server
  const app = createApp({ uploadDir: path.join(projectDir, 'temp_uploads') });

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\uD83D\uDD27 Admin API starting...`);
    console.log(`   Data dir: ${path.resolve(process.env.DATA_DIR || 'data')}`);
    console.log(`   Config dir: ${path.resolve(process.env.CONFIG_DIR || 'config')}`);
    console.log(`   Lang dir: ${path.resolve(process.env.LANG_DIR || 'lang')}`);
    console.log(`   Styles dir: ${path.resolve(process.env.STYLES_DIR || 'styles')}`);
    console.log(`   API Port: ${port}`);
    console.log(`\n\u2728 Admin API ready at: http://localhost:${port}/api/\n`);
  });

  return server;
}

module.exports = { createApp, startServer };
