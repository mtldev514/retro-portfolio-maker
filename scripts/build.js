/**
 * Build Script
 * Merges engine files with user data to generate static site.
 * Supports --watch flag for continuous rebuilds on file changes.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/** Directories to watch for changes (same as serve.js) */
const WATCH_DIRS = ['config', 'data', 'lang', 'styles'];

// Admin/dev-only files excluded from production builds (--production flag)
const ADMIN_FILES = [
  'admin.html',
  'admin.css',
  'edit.html',
  'config-manager.html',
  'validator.html',
  'admin'  // entire admin/ directory (admin API, shell scripts)
];

async function build(options = {}) {
  console.log(chalk.blue('🏗️  Building your portfolio...\n'));

  const cwd = process.cwd();
  const outputDir = path.join(cwd, options.output || 'dist');

  // Detect data source mode from config-source.json
  const configSourcePath = path.join(cwd, 'config-source.json');
  let sourceMode = 'local';
  if (fs.existsSync(configSourcePath)) {
    try {
      const cs = fs.readJsonSync(configSourcePath);
      sourceMode = cs.mode || 'local';
    } catch (e) { /* ignore parse errors, default to local */ }
  }

  const isSupabaseMode = sourceMode === 'supabase';
  if (isSupabaseMode) {
    console.log(chalk.magenta('🗄️  Supabase mode — config/data/lang will NOT be bundled\n'));
  }

  // Validate user has required directories (needed locally for build-time processing)
  const requiredDirs = ['config', 'data', 'lang'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(cwd, dir))) {
      throw new Error(`Missing required directory: ${dir}/`);
    }
  }

  console.log(chalk.cyan('📋 Validating data files...'));

  // Validate config files exist (needed for filter button generation even in supabase mode)
  const requiredConfigs = ['app.json', 'languages.json', 'categories.json'];
  for (const config of requiredConfigs) {
    const configPath = path.join(cwd, 'config', config);
    if (!fs.existsSync(configPath)) {
      throw new Error(`Missing config file: config/${config}`);
    }
  }

  console.log(chalk.green('  ✓ All data files present\n'));

  // Clean output directory
  console.log(chalk.cyan('🧹 Cleaning output directory...'));
  await fs.emptyDir(outputDir);
  console.log(chalk.green('  ✓ Output directory cleaned\n'));

  // Copy engine files
  console.log(chalk.cyan('📦 Copying engine files...'));

  const enginePath = path.join(__dirname, '../engine');

  if (!fs.existsSync(enginePath)) {
    throw new Error('Engine files not found. Package may be corrupted.');
  }

  if (options.production) {
    // Production build: exclude admin/dev-only files
    await fs.copy(enginePath, outputDir, {
      filter: (src) => {
        const relative = path.relative(enginePath, src);
        if (relative === '') return true; // allow root directory
        const topLevel = relative.split(path.sep)[0];
        return !ADMIN_FILES.includes(topLevel);
      }
    });
  } else {
    await fs.copy(enginePath, outputDir);
  }

  // Count files copied
  const engineFiles = (await fs.readdir(outputDir)).filter(f => f !== 'build-info.json');
  console.log(chalk.green(`  ✓ Copied ${engineFiles.length} engine files`));

  if (options.production) {
    console.log(chalk.yellow('  ⚡ Production mode: admin files excluded'));
  }
  console.log('');

  // Generate dynamic filter buttons from categories
  console.log(chalk.cyan('🔧 Generating filter buttons from categories...'));
  await generateFilterButtons(cwd, outputDir);
  console.log(chalk.green('  ✓ Filter buttons generated\n'));

  // Copy config-source.json to dist (frontend needs it to determine data source)
  if (fs.existsSync(configSourcePath)) {
    await fs.copy(configSourcePath, path.join(outputDir, 'config-source.json'));
    console.log(chalk.green('  ✓'), `config-source.json (mode: ${sourceMode})`);
  }

  // Copy user data directories (skipped in Supabase mode — frontend fetches from DB)
  if (isSupabaseMode) {
    console.log(chalk.cyan('📄 Skipping local data (Supabase mode)...'));
    console.log(chalk.gray('  ⊘ config/ — fetched from Supabase'));
    console.log(chalk.gray('  ⊘ data/ — fetched from Supabase'));
    console.log(chalk.gray('  ⊘ lang/ — fetched from Supabase'));
  } else {
    console.log(chalk.cyan('📄 Copying your data...'));

    const dataDirs = ['config', 'data', 'lang'];
    for (const dir of dataDirs) {
      const srcPath = path.join(cwd, dir);
      const destPath = path.join(outputDir, dir);

      await fs.copy(srcPath, destPath);

      const fileCount = (await fs.readdir(srcPath)).length;
      console.log(chalk.green('  ✓'), `${dir}/ (${fileCount} files)`);
    }
  }

  // Copy assets if exists
  const assetsPath = path.join(cwd, 'assets');
  if (fs.existsSync(assetsPath)) {
    await fs.copy(assetsPath, path.join(outputDir, 'assets'));
    const assetCount = (await fs.readdir(assetsPath)).length;
    console.log(chalk.green('  ✓'), `assets/ (${assetCount} files)`);
  }

  // Copy user styles/ directory (theme CSS files override engine defaults)
  const userStylesPath = path.join(cwd, 'styles');
  if (fs.existsSync(userStylesPath)) {
    await fs.copy(userStylesPath, path.join(outputDir, 'styles'));
    const styleFiles = (await fs.readdir(userStylesPath)).length;
    console.log(chalk.green('  ✓'), `styles/ (${styleFiles} files)`);
  }

  // Create build info
  const buildInfo = {
    buildDate: new Date().toISOString(),
    engine: {
      name: '@mtldev514/retro-portfolio-engine',
      version: require('../package.json').version
    },
    site: {
      name: path.basename(cwd)
    }
  };

  await fs.writeJson(path.join(outputDir, 'build-info.json'), buildInfo, {
    spaces: 2
  });

  console.log(chalk.green('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('✨ Build completed successfully!\n'));
  console.log(chalk.cyan('Output:'), outputDir);
  console.log(chalk.cyan('Size:'), await getDirSize(outputDir));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  • Test locally: npm run dev'));
  console.log(chalk.gray('  • Deploy: npm run deploy\n'));

  // If --watch flag, start file watchers for continuous rebuilds
  if (options.watch) {
    startBuildWatcher(cwd, options);
  }

  return outputDir;
}

/**
 * Watch user content directories and re-run build on changes.
 * Uses Node.js native fs.watch with { recursive: true } (Node 18+ macOS/Windows).
 */
function startBuildWatcher(cwd, buildOptions, debounceMs = 500) {
  let rebuildTimer = null;
  let isBuilding = false;

  const rebuild = (changedFile) => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
      if (isBuilding) return;
      isBuilding = true;
      try {
        console.log(chalk.yellow(`\n🔄 Change detected: ${changedFile}`));
        await build({ ...buildOptions, watch: false }); // avoid re-entering watch
      } catch (err) {
        console.error(chalk.red(`✗ Rebuild failed: ${err.message}\n`));
      } finally {
        isBuilding = false;
      }
    }, debounceMs);
  };

  for (const dir of WATCH_DIRS) {
    const dirPath = path.join(cwd, dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.startsWith('.') || filename.endsWith('~'))) return;
        rebuild(filename ? `${dir}/${filename}` : dir);
      });
    } catch (err) {
      console.warn(chalk.yellow(`⚠ Could not watch ${dir}/: ${err.message}`));
    }
  }

  const watchedDirs = WATCH_DIRS.filter(d => fs.existsSync(path.join(cwd, d)));
  console.log(chalk.magenta(`👀 Watching: ${watchedDirs.map(d => d + '/').join(', ')}`));
  console.log(chalk.gray('   Changes will trigger automatic rebuilds'));
  console.log(chalk.gray('   Press CTRL+C to stop\n'));

  // Keep process alive
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Stopping watch mode...'));
    process.exit(0);
  });
}

/**
 * Generate filter buttons from categories.json and inject into index.html
 */
async function generateFilterButtons(userDir, outputDir) {
  // Read categories config
  const categoriesPath = path.join(userDir, 'config', 'categories.json');
  const categories = await fs.readJson(categoriesPath);

  // Build filter buttons HTML
  const contentTypes = categories.contentTypes || categories.categories || [];

  // Validate category count (max 7 for optimal UI)
  if (contentTypes.length > 7) {
    console.warn(chalk.yellow(`  ⚠ Warning: You have ${contentTypes.length} categories. For best UI experience, limit to 7 or fewer.`));
    console.warn(chalk.yellow('  ⚠ Only the first 7 categories will be shown in the filter bar.'));
  }

  // Take only first 7 categories
  const displayCategories = contentTypes.slice(0, 7);

  let filterButtonsHtml = '<!-- Auto-generated filter buttons from categories.json -->\n';
  filterButtonsHtml += '                    <button class="filter-btn active" data-filter="all" data-i18n="filter_all">All</button>\n';

  displayCategories.forEach(category => {
    // Extract name - support both string and multilingual object formats
    let displayName = category.name;
    if (typeof displayName === 'object' && displayName !== null) {
      // If name is an object, use English as fallback for static HTML
      // The i18n system will replace this at runtime anyway
      displayName = displayName.en || displayName.fr || Object.values(displayName)[0] || category.id;
    }

    filterButtonsHtml += `                    <button class="filter-btn" data-filter="${category.id}" data-i18n="nav_${category.id}">${displayName}</button>\n`;
  });

  // Read index.html
  const indexPath = path.join(outputDir, 'index.html');
  let indexHtml = await fs.readFile(indexPath, 'utf8');

  // Replace the hardcoded filter buttons with generated ones
  // Find the section between <div id="filter-nav" and the sort controls
  const filterNavStart = indexHtml.indexOf('<div id="filter-nav"');
  const sortControlsStart = indexHtml.indexOf('<span class="sort-controls">', filterNavStart);

  if (filterNavStart === -1 || sortControlsStart === -1) {
    console.warn(chalk.yellow('  ⚠ Could not find filter nav section in index.html'));
    return;
  }

  // Find where the buttons section starts (after the opening div and class)
  const buttonsStart = indexHtml.indexOf('>', filterNavStart) + 1;

  // Extract the part before buttons, the buttons we'll replace, and the part after
  const before = indexHtml.substring(0, buttonsStart);
  const after = indexHtml.substring(sortControlsStart);

  // Reconstruct HTML with generated buttons
  indexHtml = before + '\n' + filterButtonsHtml + '                    ' + after;

  // Write back to index.html
  await fs.writeFile(indexPath, indexHtml, 'utf8');
}

/**
 * Get directory size in human-readable format
 */
async function getDirSize(dirPath) {
  let size = 0;

  async function calcSize(dir) {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        await calcSize(itemPath);
      } else {
        size += stats.size;
      }
    }
  }

  await calcSize(dirPath);

  // Convert to human-readable
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

module.exports = build;
