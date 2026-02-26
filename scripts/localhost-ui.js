#!/usr/bin/env node

/**
 * Localhost UI Script
 * Web interface to view and manage all local servers
 */

const http = require('http');
const { exec } = require('child_process');
const chalk = require('chalk');

const PORT = 9876;

// HTML template for the UI
function generateHTML(ports) {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Localhost Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', Courier, monospace;
            background: #008080;
            padding: 20px;
            color: #000;
        }

        .window {
            max-width: 1200px;
            margin: 0 auto;
            background: #c0c0c0;
            border: 2px outset #fff;
            box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
        }

        .title-bar {
            background: linear-gradient(90deg, #000080, #1084d0);
            color: white;
            padding: 4px 8px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .title-text {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-close {
            background: #c0c0c0;
            border: 2px outset #fff;
            width: 20px;
            height: 20px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .content {
            padding: 20px;
            background: #c0c0c0;
        }

        h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #000080;
        }

        .status-bar {
            background: #c0c0c0;
            border: 2px inset #fff;
            padding: 8px;
            margin-bottom: 20px;
            font-size: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 2px inset #fff;
        }

        th {
            background: #000080;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
        }

        td {
            padding: 8px;
            border-bottom: 1px solid #c0c0c0;
        }

        tr:hover {
            background: #ffffcc;
        }

        .port-link {
            color: #0000ff;
            text-decoration: underline;
            cursor: pointer;
        }

        .port-link:hover {
            color: #ff00ff;
        }

        .btn {
            background: #c0c0c0;
            border: 2px outset #fff;
            padding: 4px 12px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            margin: 2px;
        }

        .btn:hover {
            background: #e0e0e0;
        }

        .btn:active {
            border-style: inset;
        }

        .btn-danger {
            background: #ff0000;
            color: white;
        }

        .btn-danger:hover {
            background: #cc0000;
        }

        .btn-refresh {
            background: #00ff00;
        }

        .toolbar {
            margin-bottom: 20px;
            padding: 10px;
            background: #c0c0c0;
            border: 2px inset #fff;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .badge {
            background: #ffff00;
            border: 1px solid #000;
            padding: 2px 6px;
            font-size: 10px;
            margin-left: 8px;
        }

        .process-name {
            font-weight: bold;
            color: #000080;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #00ff00;
            border-radius: 50%;
            margin-right: 5px;
            animation: blink 1s infinite;
        }

        .footer {
            margin-top: 20px;
            padding: 10px;
            background: #c0c0c0;
            border-top: 2px outset #fff;
            font-size: 11px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="window">
        <div class="title-bar">
            <div class="title-text">
                <span>🖥️</span>
                <span>Localhost Manager - Retro Portfolio</span>
            </div>
            <button class="btn-close" onclick="window.close()">×</button>
        </div>

        <div class="content">
            <h1>Local Servers Monitor</h1>

            <div class="status-bar">
                <span class="status-indicator"></span>
                <span>Last updated: <span id="timestamp">${new Date().toLocaleTimeString()}</span></span>
                <span class="badge">LOCALHOST</span>
                <span class="badge">127.0.0.1</span>
            </div>

            <div class="toolbar">
                <button class="btn btn-refresh" onclick="refreshPorts()">🔄 Refresh</button>
                <button class="btn" onclick="toggleAutoRefresh()">
                    <span id="auto-refresh-text">⏸️ Auto-refresh: ON</span>
                </button>
                <span style="margin-left: 20px;">
                    Total: <strong id="port-count">${ports.length}</strong> |
                    Web: <strong id="web-count">${countWebServers(ports)}</strong> |
                    DB: <strong id="db-count">${countDatabases(ports)}</strong>
                </span>
            </div>

            <table id="ports-table">
                <thead>
                    <tr>
                        <th>Port</th>
                        <th>Type</th>
                        <th>Process</th>
                        <th>Status</th>
                        <th>Uptime</th>
                        <th>Memory</th>
                        <th>CPU</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="ports-body">
                    ${generatePortRows(ports)}
                </tbody>
            </table>

            ${ports.length === 0 ? '<div class="empty-state">No active ports found. Start some servers!</div>' : ''}

            <div class="footer">
                Retro Portfolio Localhost Manager v1.0 | Running on port ${PORT} | Press Ctrl+C in terminal to stop
            </div>
        </div>
    </div>

    <script>
        let autoRefresh = true;
        let refreshInterval;

        function startAutoRefresh() {
            refreshInterval = setInterval(refreshPorts, 2000);
        }

        function stopAutoRefresh() {
            clearInterval(refreshInterval);
        }

        function toggleAutoRefresh() {
            autoRefresh = !autoRefresh;
            const text = document.getElementById('auto-refresh-text');
            if (autoRefresh) {
                text.textContent = '⏸️ Auto-refresh: ON';
                startAutoRefresh();
            } else {
                text.textContent = '▶️ Auto-refresh: OFF';
                stopAutoRefresh();
            }
        }

        async function refreshPorts() {
            try {
                const response = await fetch('/api/ports');
                const data = await response.json();

                const tbody = document.getElementById('ports-body');
                tbody.innerHTML = data.html;

                document.getElementById('timestamp').textContent = new Date().toLocaleTimeString();
                document.getElementById('port-count').textContent = data.count;
                document.getElementById('web-count').textContent = data.webCount;
                document.getElementById('db-count').textContent = data.dbCount;
            } catch (err) {
                console.error('Refresh failed:', err);
            }
        }

        async function killPort(port) {
            if (!confirm(\`Kill all processes on port \${port}?\`)) {
                return;
            }

            try {
                const response = await fetch(\`/api/kill/\${port}\`, { method: 'POST' });
                const result = await response.json();

                if (result.success) {
                    alert(\`✅ Killed processes on port \${port}\`);
                    refreshPorts();
                } else {
                    alert(\`❌ Failed to kill port \${port}: \${result.error}\`);
                }
            } catch (err) {
                alert(\`❌ Error: \${err.message}\`);
            }
        }

        function openPort(port) {
            window.open(\`http://localhost:\${port}\`, '_blank');
        }

        // Start auto-refresh
        startAutoRefresh();
    </script>
</body>
</html>`;
}

function generatePortRows(ports) {
  if (ports.length === 0) {
    return '<tr><td colspan="8" style="text-align: center; color: #666;">No active ports</td></tr>';
  }

  return ports.map(p => `
    <tr>
        <td><strong>:${p.port}</strong></td>
        <td>
            <span title="${p.type.type}">${p.type.icon} ${p.type.type}</span>
        </td>
        <td>
            <span class="process-name">${p.command}</span>
            <div style="font-size: 9px; color: #666;">PID: ${p.pid} • ${p.user}</div>
        </td>
        <td><span title="Health check">${p.status}</span></td>
        <td>${p.uptime}</td>
        <td>${p.memory}</td>
        <td>${p.cpu}</td>
        <td>
            <button class="btn" onclick="openPort(${p.port})" title="Open in browser">🌐 Open</button>
            <button class="btn btn-danger" onclick="killPort(${p.port})">💀 Kill</button>
        </td>
    </tr>
  `).join('');
}

async function getPorts() {
  return new Promise((resolve, reject) => {
    exec('lsof -iTCP -sTCP:LISTEN -n -P', async (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const lines = stdout.trim().split('\n');
      const ports = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/);
        const command = parts[0];
        const pid = parts[1];
        const user = parts[2];
        const name = parts[8] || '';

        const match = name.match(/:(\d+)$/);
        if (match) {
          const port = match[1];

          // Avoid duplicates
          if (!ports.find(p => p.port === port && p.pid === pid)) {
            ports.push({ command, pid, user, port });
          }
        }
      }

      // Sort by port number
      ports.sort((a, b) => parseInt(a.port) - parseInt(b.port));

      // Enrich with additional metadata
      const enrichedPorts = await Promise.all(ports.map(p => enrichPortData(p)));
      resolve(enrichedPorts);
    });
  });
}

/**
 * Enrich port data with additional metadata
 */
async function enrichPortData(portData) {
  const enriched = { ...portData };

  // Detect protocol/framework
  enriched.type = detectPortType(portData.port, portData.command);

  // Get process uptime and resource usage
  try {
    const psOutput = await new Promise((resolve) => {
      exec(`ps -p ${portData.pid} -o etime=,rss=,pcpu=`, (err, stdout) => {
        if (err) resolve(null);
        else resolve(stdout.trim());
      });
    });

    if (psOutput) {
      const parts = psOutput.trim().split(/\s+/);
      enriched.uptime = parts[0] || 'unknown';
      enriched.memory = parts[1] ? formatMemory(parseInt(parts[1])) : 'unknown';
      enriched.cpu = parts[2] ? `${parseFloat(parts[2]).toFixed(1)}%` : '0%';
    }
  } catch (err) {
    enriched.uptime = 'unknown';
    enriched.memory = 'unknown';
    enriched.cpu = '0%';
  }

  // Check if server is responding
  enriched.status = await checkServerHealth(portData.port);

  return enriched;
}

/**
 * Detect server type based on port and process name
 */
function detectPortType(port, command) {
  const portInt = parseInt(port);

  // Known ports
  const knownPorts = {
    3000: { type: 'React/Next.js', icon: '⚛️' },
    3001: { type: 'React (alt)', icon: '⚛️' },
    4200: { type: 'Angular', icon: '🅰️' },
    5000: { type: 'Express/Rails', icon: '📦' },
    5001: { type: 'Admin API', icon: '🔧' },
    8000: { type: 'Dev Server/HTTP', icon: '🌐' },
    8080: { type: 'Tomcat/HTTP', icon: '☕' },
    9000: { type: 'General', icon: '🌐' },
    3306: { type: 'MySQL', icon: '🗄️' },
    5432: { type: 'PostgreSQL', icon: '🐘' },
    6379: { type: 'Redis', icon: '📦' },
    27017: { type: 'MongoDB', icon: '🍃' },
    9876: { type: 'Localhost Manager', icon: '🖥️' },
  };

  if (knownPorts[portInt]) {
    return knownPorts[portInt];
  }

  // Detect by command name
  const cmd = command.toLowerCase();
  if (cmd.includes('node')) return { type: 'Node.js', icon: '🟢' };
  if (cmd.includes('python')) return { type: 'Python', icon: '🐍' };
  if (cmd.includes('ruby')) return { type: 'Ruby', icon: '💎' };
  if (cmd.includes('java')) return { type: 'Java', icon: '☕' };
  if (cmd.includes('nginx')) return { type: 'Nginx', icon: '🌐' };
  if (cmd.includes('apache')) return { type: 'Apache', icon: '🪶' };
  if (cmd.includes('postgres')) return { type: 'PostgreSQL', icon: '🐘' };
  if (cmd.includes('mysql')) return { type: 'MySQL', icon: '🗄️' };
  if (cmd.includes('redis')) return { type: 'Redis', icon: '📦' };
  if (cmd.includes('mongo')) return { type: 'MongoDB', icon: '🍃' };

  // WebSocket detection
  if (portInt >= 18000 && portInt < 19000) {
    return { type: 'WebSocket', icon: '🔌' };
  }

  return { type: 'Unknown', icon: '❓' };
}

/**
 * Check if server is responding
 */
async function checkServerHealth(port) {
  return new Promise((resolve) => {
    const http = require('http');

    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 1000,
      },
      (res) => {
        resolve('✅ Healthy');
      }
    );

    req.on('error', () => {
      // Server exists but may not be HTTP
      resolve('⚠️ Running');
    });

    req.on('timeout', () => {
      req.destroy();
      resolve('⏱️ Slow');
    });

    req.end();
  });
}

/**
 * Format memory in human-readable format
 */
function formatMemory(kb) {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Count web servers
 */
function countWebServers(ports) {
  const webTypes = ['React/Next.js', 'Angular', 'Express/Rails', 'Dev Server/HTTP', 'Node.js', 'Nginx', 'Apache', 'Tomcat/HTTP', 'Ruby'];
  return ports.filter(p => webTypes.includes(p.type.type)).length;
}

/**
 * Count databases
 */
function countDatabases(ports) {
  const dbTypes = ['MySQL', 'PostgreSQL', 'Redis', 'MongoDB'];
  return ports.filter(p => dbTypes.includes(p.type.type)).length;
}

function killPortProcess(port) {
  return new Promise((resolve, reject) => {
    exec(`lsof -ti :${port}`, (error, stdout) => {
      if (error || !stdout.trim()) {
        reject(new Error('No process found on port'));
        return;
      }

      const pids = stdout.trim().split('\n').filter(Boolean);
      exec(`kill -9 ${pids.join(' ')}`, (killError) => {
        if (killError) {
          reject(killError);
        } else {
          resolve(pids);
        }
      });
    });
  });
}

async function startServer(options = {}) {
  const port = options.port || PORT;

  const server = http.createServer(async (req, res) => {
    // API: Get ports as JSON
    if (req.url === '/api/ports') {
      const ports = await getPorts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ports,
        count: ports.length,
        webCount: countWebServers(ports),
        dbCount: countDatabases(ports),
        html: generatePortRows(ports)
      }));
      return;
    }

    // API: Kill port
    if (req.url.startsWith('/api/kill/') && req.method === 'POST') {
      const port = req.url.split('/')[3];
      try {
        await killPortProcess(port);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // Default: Serve HTML
    const ports = await getPorts();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(generateHTML(ports));
  });

  server.listen(port, () => {
    console.log(chalk.blue('\n🖥️  Localhost Manager Started!\n'));
    console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan('  URL:'), chalk.bold(`http://localhost:${port}`));
    console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    console.log(chalk.gray('Features:'));
    console.log(chalk.gray('  • View all active ports'));
    console.log(chalk.gray('  • Click links to open servers'));
    console.log(chalk.gray('  • Kill processes with one click'));
    console.log(chalk.gray('  • Auto-refresh every 2 seconds\n'));
    console.log(chalk.yellow('Press Ctrl+C to stop\n'));

    // Auto-open browser if requested
    if (options.open) {
      try {
        const open = require('open');
        open(`http://localhost:${port}`);
      } catch (err) {
        console.log(chalk.yellow('Note: Install "open" package for auto-open: npm install open'));
      }
    }
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down Localhost Manager...'));
    server.close();
    process.exit(0);
  });

  return server;
}

module.exports = startServer;

// Run if called directly
if (require.main === module) {
  const open = process.argv.includes('--open') || process.argv.includes('-o');
  startServer({ open });
}
