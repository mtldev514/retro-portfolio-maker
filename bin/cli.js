#!/usr/bin/env node

/**
 * Retro Portfolio CLI
 * Main command-line interface for the package
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

const program = new Command();

// Import scripts
const build = require('../scripts/build');
const serve = require('../scripts/serve');
const admin = require('../scripts/admin');
const init = require('../scripts/init');
const sync = require('../scripts/sync');
const listPorts = require('../scripts/list-ports');
const killPort = require('../scripts/kill-port');
const localhostUI = require('../scripts/localhost-ui');

program
  .name('retro-portfolio')
  .description('Retro Portfolio Site Engine')
  .version(require('../package.json').version);

// Init command - Create new portfolio
program
  .command('init [directory]')
  .description('Initialize a new portfolio with data templates')
  .option('-f, --force', 'Overwrite existing files')
  .action(async (directory, options) => {
    try {
      await init(directory || '.', options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Sync command - Update existing portfolio
program
  .command('sync')
  .alias('update')
  .description('Sync existing portfolio with latest templates (non-destructive)')
  .option('-f, --force', 'Force update of workflow files')
  .action(async (options) => {
    try {
      await sync(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Build command - Generate static site
program
  .command('build')
  .description('Build the static site from your data')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('-w, --watch', 'Watch for changes and rebuild')
  .action(async (options) => {
    try {
      await build(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Serve command - Local development server
program
  .command('dev')
  .alias('serve')
  .description('Start local development server')
  .option('-p, --port <number>', 'Port number', '8000')
  .option('-o, --open', 'Open browser automatically')
  .action(async (options) => {
    try {
      await serve(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Admin command - Launch admin interface
program
  .command('admin')
  .description('Start admin interface for managing content')
  .option('-p, --port <number>', 'Port number', '5001')
  .option('-o, --open', 'Open browser automatically')
  .action(async (options) => {
    try {
      await admin(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Validate command - Check configuration files
program
  .command('validate')
  .description('Validate all configuration and data files')
  .option('--path <dir>', 'Portfolio content directory', '.')
  .action(async (options) => {
    try {
      const { spawn } = require('child_process');
      const enginePath = path.join(__dirname, '..', 'engine', 'admin', 'scripts');
      const validatorPath = path.join(enginePath, 'validate_config.py');

      console.log(chalk.cyan('🔍 Running configuration validator...\n'));

      const python = spawn('python3', [validatorPath, '--path', options.path], {
        stdio: 'inherit',
        env: { ...process.env, PORTFOLIO_CONTENT_ROOT: options.path }
      });

      python.on('close', (code) => {
        process.exit(code);
      });

      python.on('error', (err) => {
        console.error(chalk.red('Error running validator:'), err.message);
        console.log(chalk.yellow('\nMake sure Python 3 is installed and in your PATH'));
        process.exit(1);
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Deploy command - Deploy to GitHub Pages
program
  .command('deploy')
  .description('Deploy site to GitHub Pages')
  .option('-b, --branch <name>', 'Deployment branch', 'gh-pages')
  .option('-d, --dir <path>', 'Build directory', 'dist')
  .action(async (options) => {
    console.log(chalk.yellow('Deploy command coming soon!'));
    console.log('For now, use GitHub Actions or push dist/ manually.');
  });

// List ports command - Show active ports
program
  .command('ports')
  .description('List all active ports on the machine')
  .action(() => {
    try {
      listPorts();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Kill port command - Kill process on specific port
program
  .command('kill <port>')
  .description('Kill all processes listening on a specific port')
  .action((port) => {
    try {
      killPort(port);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Localhost UI command - Visual interface for port management
program
  .command('localhost')
  .description('Open visual UI to view and manage all localhost servers')
  .option('-p, --port <number>', 'Port number', '9876')
  .option('-o, --open', 'Open browser automatically')
  .action(async (options) => {
    try {
      await localhostUI(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
