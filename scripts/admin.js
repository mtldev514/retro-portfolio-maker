/**
 * Admin Script
 * Launches admin interface for content management
 * Uses the Node.js Express API (replaces Python Flask)
 */

const chalk = require('chalk');
const path = require('path');

async function admin(options = {}) {
  const port = options.port || 5001;
  const cwd = process.cwd();

  console.log(chalk.blue('🔧 Starting admin interface...\n'));

  // Resolve directory paths for the user's project
  const dirs = {
    data: path.join(cwd, 'data'),
    config: path.join(cwd, 'config'),
    lang: path.join(cwd, 'lang'),
    styles: path.join(cwd, 'styles'),
    project: cwd,
  };

  // Start the Express admin API
  const { startServer } = require('../engine/admin/api');

  const server = startServer({ port, dirs });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down admin...'));
    server.close();
    process.exit(0);
  });

  return server;
}

module.exports = admin;
