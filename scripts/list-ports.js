#!/usr/bin/env node

/**
 * List Ports Script
 * Shows all active servers and ports on the machine
 */

const { exec } = require('child_process');
const chalk = require('chalk');

function listPorts() {
  console.log(chalk.blue('🔍 Scanning active ports...\n'));

  // Use lsof to find listening ports
  exec('lsof -iTCP -sTCP:LISTEN -n -P', (error, stdout, stderr) => {
    if (error) {
      console.error(chalk.red('Error scanning ports:'), error.message);
      console.log(chalk.yellow('\nTip: Try running with sudo if you get permission errors'));
      return;
    }

    const lines = stdout.trim().split('\n');

    if (lines.length <= 1) {
      console.log(chalk.gray('No active ports found.'));
      return;
    }

    // Parse lsof output
    const ports = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      const command = parts[0];
      const pid = parts[1];
      const user = parts[2];
      const name = parts[8] || '';

      // Extract port from address like "*:8000" or "127.0.0.1:3000"
      const match = name.match(/:(\d+)$/);
      if (match) {
        const port = match[1];
        ports.push({ command, pid, user, port });
      }
    }

    // Group by port
    const portMap = {};
    ports.forEach(p => {
      if (!portMap[p.port]) {
        portMap[p.port] = [];
      }
      portMap[p.port].push(p);
    });

    // Display results
    const sortedPorts = Object.keys(portMap).sort((a, b) => parseInt(a) - parseInt(b));

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('  PORT    PROCESS          PID      USER'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    sortedPorts.forEach(port => {
      const processes = portMap[port];
      processes.forEach((p, idx) => {
        const isFirst = idx === 0;
        const portDisplay = isFirst ? chalk.green(`:${port}`) : '      ';
        const commandDisplay = p.command.padEnd(15);
        const pidDisplay = p.pid.padEnd(8);

        console.log(`  ${portDisplay}  ${commandDisplay} ${pidDisplay} ${chalk.gray(p.user)}`);
      });
    });

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Highlight common development ports
    const devPorts = {
      '3000': 'React / Next.js',
      '4200': 'Angular',
      '5000': 'Flask / Rails',
      '5001': 'Flask API',
      '8000': 'Django / Python HTTP',
      '8080': 'Tomcat / Alternative HTTP',
      '3001': 'React (alt)',
      '9000': 'Various',
    };

    console.log(chalk.cyan('Common Development Ports:'));
    sortedPorts.forEach(port => {
      if (devPorts[port]) {
        console.log(chalk.gray(`  :${port} → ${devPorts[port]}`));
      }
    });
    console.log('');

    // Show total
    console.log(chalk.gray(`Total: ${sortedPorts.length} port(s) in use\n`));
  });
}

// Run if called directly
if (require.main === module) {
  listPorts();
}

module.exports = listPorts;
