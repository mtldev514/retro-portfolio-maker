# Localhost Metadata Reference

## What We Track

The Localhost Manager collects rich metadata about every running server on your machine.

### Core Information

| Field | Description | Example |
|-------|-------------|---------|
| **Port** | The port number | `:8000` |
| **PID** | Process ID | `12345` |
| **User** | User running the process | `alexcat` |
| **Command** | Process command name | `Python`, `node` |

### Enhanced Metadata

| Field | Description | Example | How It's Detected |
|-------|-------------|---------|-------------------|
| **Type** | Framework/server type | `📦 Express/Rails` | Port number + process name |
| **Icon** | Visual indicator | `⚛️`, `📦`, `🍃` | Mapped from type |
| **Status** | Health check status | `✅ Healthy`, `⚠️ Running` | HTTP request to localhost |
| **Uptime** | How long process is running | `2:15:30`, `1-03:45:20` | From `ps` command |
| **Memory** | RAM usage | `45.2 MB`, `1.2 GB` | From `ps` RSS field |
| **CPU** | CPU usage percentage | `2.5%`, `0.1%` | From `ps` PCPU field |

## Auto-Detection

### Port-Based Detection

We automatically detect common frameworks by port number:

```javascript
3000  → ⚛️  React/Next.js
3001  → ⚛️  React (alt)
4200  → 🅰️  Angular
5000  → 📦  Express/Rails
5001  → 🔧  Admin API
8000  → 🌐  Dev Server/HTTP
8080  → ☕  Tomcat/HTTP
3306  → 🗄️  MySQL
5432  → 🐘  PostgreSQL
6379  → 📦  Redis
27017 → 🍃  MongoDB
18789 → 🔌  WebSocket (your OpenClaw Gateway!)
```

### Process-Based Detection

When port number doesn't match, we detect by process name:

```javascript
node      → 🟢 Node.js
python    → 🐍 Python
ruby      → 💎 Ruby
java      → ☕ Java
nginx     → 🌐 Nginx
apache    → 🪶 Apache
postgres  → 🐘 PostgreSQL
mysql     → 🗄️ MySQL
redis     → 📦 Redis
mongo     → 🍃 MongoDB
```

### Health Check

We perform a quick HTTP request to determine status:

- `✅ Healthy` - Server responds with HTTP status
- `⚠️ Running` - Server is up but not responding to HTTP (e.g., WebSocket, database)
- `⏱️ Slow` - Server took >1 second to respond

## Statistics

The toolbar shows useful aggregations:

- **Total**: All active ports
- **Web**: React, Express, Node.js, Nginx, etc.
- **DB**: MySQL, PostgreSQL, Redis, MongoDB

## Example Output

When you open http://localhost:9876, you might see:

| Port | Type | Process | Status | Uptime | Memory | CPU | Actions |
|------|------|---------|--------|--------|--------|-----|---------|
| :5001 | 🔧 Admin API | node | ✅ Healthy | 1:23:45 | 89.3 MB | 0.5% | 🌐 Open 💀 Kill |
| :8000 | 🌐 Dev Server/HTTP | node | ✅ Healthy | 1:23:50 | 124.7 MB | 1.2% | 🌐 Open 💀 Kill |
| :9876 | 🖥️ Localhost Manager | node | ✅ Healthy | 0:02:15 | 45.1 MB | 0.3% | 🌐 Open 💀 Kill |
| :18789 | 🔌 WebSocket | Python | ⚠️ Running | 3:12:08 | 67.4 MB | 0.1% | 🌐 Open 💀 Kill |

## Future Enhancements

Possible additions:

- **Network traffic**: Bytes sent/received
- **Connection count**: Active connections per port
- **Response time**: Average latency
- **Error rate**: Failed requests per minute
- **Environment**: Development vs production
- **Git branch**: Current branch for dev servers
- **Hot reload**: Detect if watching for file changes
- **SSL/TLS**: HTTPS detection
- **Docker**: Detect if running in container
- **Parent process**: What spawned this server

## Technical Details

### Commands Used

```bash
# List all listening TCP ports
lsof -iTCP -sTCP:LISTEN -n -P

# Get process details (uptime, memory, CPU)
ps -p <PID> -o etime=,rss=,pcpu=

# Find PIDs on specific port
lsof -ti :<PORT>

# Kill processes
kill -9 <PID>
```

### Performance

- Initial scan: ~100-200ms
- Enrichment per port: ~20-50ms
- Health check per port: 0-1000ms (times out after 1s)
- Total refresh: Usually <2 seconds for 10 ports

### Memory Format

- RSS (Resident Set Size) from `ps` in KB
- Converted to human-readable: KB → MB → GB

### Uptime Format

From `ps -o etime`:
- `2:15` = 2 minutes 15 seconds
- `1:23:45` = 1 hour 23 minutes 45 seconds
- `2-03:45:20` = 2 days 3 hours 45 minutes 20 seconds

Enjoy your enhanced localhost visibility! 🖥️✨
