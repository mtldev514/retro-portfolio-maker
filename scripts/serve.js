/**
 * Serve Script
 * Local development server with file watching & auto-rebuild
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

/** Directories to watch for changes (user content that gets copied to dist/) */
const WATCH_DIRS = ['config', 'data', 'lang', 'styles'];

/**
 * Start file watchers on user content directories.
 * On any change → re-run build → http-server serves updated dist/.
 *
 * Uses Node.js native fs.watch with { recursive: true } (Node 18+ macOS/Windows).
 * Debounces rapid changes (e.g. editor save + backup) into a single rebuild.
 */
function startWatchers(cwd, buildFn, debounceMs = 500) {
  let rebuildTimer = null;
  let isBuilding = false;

  const rebuild = (changedFile) => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
      if (isBuilding) return;
      isBuilding = true;
      try {
        console.log(chalk.yellow(`\n🔄 Change detected: ${changedFile}`));
        console.log(chalk.cyan('   Rebuilding...\n'));
        await buildFn({ output: 'dist' });
        console.log(chalk.green('   ✨ Rebuild complete — refresh your browser\n'));
      } catch (err) {
        console.error(chalk.red(`   ✗ Rebuild failed: ${err.message}\n`));
      } finally {
        isBuilding = false;
      }
    }, debounceMs);
  };

  const watchers = [];

  for (const dir of WATCH_DIRS) {
    const dirPath = path.join(cwd, dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        // Ignore hidden files and temp files
        if (filename && (filename.startsWith('.') || filename.endsWith('~'))) return;
        const relPath = filename ? `${dir}/${filename}` : dir;
        rebuild(relPath);
      });

      watcher.on('error', (err) => {
        console.warn(chalk.yellow(`  ⚠ Watcher error on ${dir}/: ${err.message}`));
      });

      watchers.push(watcher);
    } catch (err) {
      console.warn(chalk.yellow(`  ⚠ Could not watch ${dir}/: ${err.message}`));
    }
  }

  const watchedDirs = WATCH_DIRS.filter(d => fs.existsSync(path.join(cwd, d)));
  console.log(chalk.magenta(`👀 Watching: ${watchedDirs.map(d => d + '/').join(', ')}`));
  console.log(chalk.gray('   Changes auto-rebuild to dist/\n'));

  return watchers;
}

async function serve(options = {}) {
  const port = options.port || 8000;
  const cwd = process.cwd();
  const distPath = path.join(cwd, 'dist');

  console.log(chalk.blue('🚀 Starting development server...\n'));

  // Always build first to ensure dist/ is fresh
  const build = require('./build');
  if (!fs.existsSync(distPath)) {
    console.log(chalk.yellow('⚠️  No build found. Building first...\n'));
  }
  await build({ output: 'dist' });
  console.log('');

  // Start HTTP server using http-server (npm package, no Python needed)
  console.log(chalk.cyan('Starting server...'));

  const httpServerBin = require.resolve('http-server/bin/http-server');
  const serverProcess = spawn(process.execPath, [httpServerBin, distPath, '-p', port, '-c-1'], {
    stdio: 'inherit'
  });

  console.log(chalk.green('\n✨ Server running!\n'));
  console.log(chalk.cyan('Local:'), `http://localhost:${port}`);
  console.log('');

  // Start file watchers for auto-rebuild
  const watchers = startWatchers(cwd, build);

  console.log(chalk.gray('Press CTRL+C to stop\n'));

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down server...'));
    watchers.forEach(w => w.close());
    serverProcess.kill();
    process.exit(0);
  });

  // Auto-open browser if requested
  if (options.open) {
    const open = require('open');
    await open(`http://localhost:${port}`);
  }

  return serverProcess;
}

module.exports = serve;
