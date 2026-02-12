/**
 * Admin Script
 * Launches admin interface for content management
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

async function admin(options = {}) {
  const port = options.port || 5001;
  const cwd = process.cwd();

  console.log(chalk.blue('🔧 Starting admin interface...\n'));

  // Check if admin_api.py exists in engine
  const adminApiPath = path.join(__dirname, '../engine/admin/admin_api.py');
  const userDataPath = cwd;

  if (!fs.existsSync(adminApiPath)) {
    console.log(chalk.red('❌ Admin API not found at:'), adminApiPath);
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log(chalk.gray('  1. Make sure you have the latest version:'));
    console.log(chalk.gray('     npm install @mtldev514/retro-portfolio-engine@latest'));
    console.log(chalk.gray('  2. Install Flask:'));
    console.log(chalk.gray('     pip install flask flask-cors\n'));
    return;
  }

  // Set environment variable to point to user data
  const env = {
    ...process.env,
    DATA_DIR: path.join(userDataPath, 'data'),
    CONFIG_DIR: path.join(userDataPath, 'config'),
    LANG_DIR: path.join(userDataPath, 'lang'),
    PORT: port
  };

  console.log(chalk.cyan('Starting admin API...'));

  // Start Flask API
  const apiProcess = spawn('python3', [adminApiPath], {
    env,
    stdio: 'inherit'
  });

  console.log(chalk.green('\n✨ Admin API running!\n'));
  console.log(chalk.cyan('API:'), `http://localhost:${port}/api/`);
  console.log(chalk.gray('Access admin interface at: http://localhost:8000/admin.html'));
  console.log(chalk.gray('\nPress CTRL+C to stop\n'));

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down admin...'));
    apiProcess.kill();
    process.exit(0);
  });

  return apiProcess;
}

module.exports = admin;
