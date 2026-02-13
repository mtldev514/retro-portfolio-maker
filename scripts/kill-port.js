#!/usr/bin/env node

/**
 * Kill Port Script
 * Kills all processes listening on a specific port
 */

const { exec } = require('child_process');
const chalk = require('chalk');

function killPort(port) {
  if (!port) {
    console.error(chalk.red('Error: Port number required'));
    console.log(chalk.gray('Usage: node kill-port.js <port>'));
    console.log(chalk.gray('Example: node kill-port.js 8000'));
    process.exit(1);
  }

  console.log(chalk.blue(`🔍 Finding processes on port ${port}...\n`));

  // Find PIDs listening on the port
  exec(`lsof -ti :${port}`, (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      console.log(chalk.yellow(`No processes found on port ${port}`));
      return;
    }

    const pids = stdout.trim().split('\n').filter(Boolean);

    console.log(chalk.cyan(`Found ${pids.length} process(es) on port ${port}:`));

    // Get details for each PID
    const detailPromises = pids.map(pid => {
      return new Promise((resolve) => {
        exec(`ps -p ${pid} -o comm=`, (err, stdout) => {
          const command = stdout.trim() || 'unknown';
          console.log(chalk.gray(`  • PID ${pid}: ${command}`));
          resolve();
        });
      });
    });

    Promise.all(detailPromises).then(() => {
      console.log('');
      console.log(chalk.red(`💀 Killing ${pids.length} process(es)...`));

      // Kill all PIDs
      exec(`kill -9 ${pids.join(' ')}`, (killError) => {
        if (killError) {
          console.error(chalk.red('Error killing processes:'), killError.message);
          console.log(chalk.yellow('\nTip: Try running with sudo if you get permission errors'));
        } else {
          console.log(chalk.green(`✅ Successfully killed all processes on port ${port}\n`));
        }
      });
    });
  });
}

// Run if called directly
if (require.main === module) {
  const port = process.argv[2];
  killPort(port);
}

module.exports = killPort;
