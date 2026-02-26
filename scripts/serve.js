/**
 * Serve Script
 * Local development server using http-server (replaces python3 -m http.server)
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

async function serve(options = {}) {
  const port = options.port || 8000;
  const cwd = process.cwd();
  const distPath = path.join(cwd, 'dist');

  console.log(chalk.blue('🚀 Starting development server...\n'));

  // Check if dist exists, if not build first
  if (!fs.existsSync(distPath)) {
    console.log(chalk.yellow('⚠️  No build found. Building first...\n'));
    const build = require('./build');
    await build({ output: 'dist' });
    console.log('');
  }

  // Start HTTP server using http-server (npm package, no Python needed)
  console.log(chalk.cyan('Starting server...'));

  const httpServerBin = require.resolve('http-server/bin/http-server');
  const serverProcess = spawn(process.execPath, [httpServerBin, distPath, '-p', port, '-c-1'], {
    stdio: 'inherit'
  });

  console.log(chalk.green('\n✨ Server running!\n'));
  console.log(chalk.cyan('Local:'), `http://localhost:${port}`);
  console.log(chalk.gray('\nPress CTRL+C to stop\n'));

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down server...'));
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
