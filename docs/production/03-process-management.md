# Process Management

**Start, monitor, and control FF Terminal processes in production**

---

## Overview

FF Terminal uses a dual-process architecture: daemon (WebSocket server) and UI client. Process management ensures reliable startup, graceful shutdown, automatic restart, and resource monitoring.

## Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Process Supervisor                        │
│                  (PM2 / systemd / launchd)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Daemon  │  │ Web UI  │  │ CLI UI  │
   │ Port:   │  │ Port:   │  │ TTY:    │
   │ 28888   │  │ 8787    │  │ stdin   │
   └─────────┘  └─────────┘  └─────────┘
```

---

## PM2 (Recommended)

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'ff-terminal-daemon',
      script: 'dist/daemon/daemon.js',
      cwd: '/path/to/ff-terminal-ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        FF_DAEMON_LOG: '1'
      },
      error_file: '~/pm2-logs/ff-daemon-error.log',
      out_file: '~/pm2-logs/ff-daemon-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true
    },
    {
      name: 'ff-terminal-web',
      script: 'dist/web/server.js',
      cwd: '/path/to/ff-terminal-ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        FF_DAEMON_HOST: 'localhost',
        FF_DAEMON_PORT: '28888'
      },
      error_file: '~/pm2-logs/ff-web-error.log',
      out_file: '~/pm2-logs/ff-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
```

### Start Processes

```bash
# Start all processes
pm2 start ecosystem.config.js

# Start specific app
pm2 start ecosystem.config.js --only ff-terminal-daemon

# Start with environment
pm2 start ecosystem.config.js --env production
```

### Monitor Processes

```bash
# Real-time monitoring
pm2 monit

# List all processes
pm2 list

# View process details
pm2 show ff-terminal-daemon

# View logs
pm2 logs ff-terminal-daemon

# View logs with tail
pm2 logs ff-terminal-daemon --lines 100

# Clear logs
pm2 flush
```

### Process Control

```bash
# Restart all processes
pm2 restart all

# Restart specific process
pm2 restart ff-terminal-daemon

# Reload (zero-downtime)
pm2 reload all

# Stop all processes
pm2 stop all

# Stop specific process
pm2 stop ff-terminal-daemon

# Delete all processes
pm2 delete all

# Delete specific process
pm2 delete ff-terminal-daemon
```

### Startup Script

Generate startup script for automatic start on boot:

```bash
# Generate startup script
pm2 startup

# Follow instructions (usually: sudo env PATH=$PATH:... pm2 startup ...)

# Save current process list
pm2 save

# Disable startup script
pm2 unstartup
```

### Clustering

```bash
# Start with multiple instances (CPU cores)
pm2 start ecosystem.config.js -i max

# Start with 2 instances
pm2 start ecosystem.config.js -i 2

# Note: Daemon must be single instance, web can be clustered
```

---

## systemd (Linux)

### Service File

Create `/etc/systemd/system/ff-terminal-daemon.service`:

```ini
[Unit]
Description=FF Terminal Daemon
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/ff-terminal-ts
ExecStart=/usr/bin/node dist/daemon/daemon.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ff-terminal-daemon

Environment=NODE_ENV=production
Environment=FF_DAEMON_LOG=1

# Resource limits
LimitNOFILE=65536
MemoryMax=1G

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/ff-terminal-web.service`:

```ini
[Unit]
Description=FF Terminal Web Server
After=network.target ff-terminal-daemon.service
Requires=ff-terminal-daemon.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/ff-terminal-ts
ExecStart=/usr/bin/node dist/web/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ff-terminal-web

Environment=NODE_ENV=production
Environment=FF_DAEMON_HOST=localhost
Environment=FF_DAEMON_PORT=28888

# Resource limits
LimitNOFILE=65536
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable ff-terminal-daemon
sudo systemctl enable ff-terminal-web

# Start services
sudo systemctl start ff-terminal-daemon
sudo systemctl start ff-terminal-web

# Check status
sudo systemctl status ff-terminal-daemon
sudo systemctl status ff-terminal-web
```

### Process Control

```bash
# Start service
sudo systemctl start ff-terminal-daemon

# Stop service
sudo systemctl stop ff-terminal-daemon

# Restart service
sudo systemctl restart ff-terminal-daemon

# Reload configuration
sudo systemctl reload ff-terminal-daemon

# Disable service (stop on boot)
sudo systemctl disable ff-terminal-daemon

# View logs
sudo journalctl -u ff-terminal-daemon -f

# View last 100 lines
sudo journalctl -u ff-terminal-daemon -n 100

# View logs since specific time
sudo journalctl -u ff-terminal-daemon --since "2024-01-01 00:00:00"
```

### Service Monitoring

```bash
# Check if service is active
sudo systemctl is-active ff-terminal-daemon

# Check if service is enabled
sudo systemctl is-enabled ff-terminal-daemon

# Check service status
sudo systemctl status ff-terminal-daemon

# List all failed services
sudo systemctl --failed
```

---

## launchd (macOS)

### Property List File

Create `~/Library/LaunchAgents/com.ffterminal.daemon.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ffterminal.daemon</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/ff-terminal-ts/dist/daemon/daemon.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/path/to/ff-terminal-ts</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/ff-daemon-out.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/ff-daemon-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>FF_DAEMON_LOG</key>
        <string>1</string>
    </dict>

    <key>SoftResourceLimits</key>
    <dict>
        <key>NumberOfFiles</key>
        <integer>65536</integer>
    </dict>
</dict>
</plist>
```

### Load and Start

```bash
# Load service
launchctl load ~/Library/LaunchAgents/com.ffterminal.daemon.plist

# Start service
launchctl start com.ffterminal.daemon

# Check status
launchctl list | grep ffterminal

# View logs
tail -f /tmp/ff-daemon-out.log
tail -f /tmp/ff-daemon-error.log
```

### Process Control

```bash
# Start service
launchctl start com.ffterminal.daemon

# Stop service
launchctl stop com.ffterminal.daemon

# Restart service
launchctl stop com.ffterminal.daemon
launchctl start com.ffterminal.daemon

# Unload service
launchctl unload ~/Library/LaunchAgents/com.ffterminal.daemon.plist
```

---

## Manual Process Management

### Start in Background

```bash
# Start daemon with nohup
nohup node dist/daemon/daemon.js > ~/ff-daemon.out 2> ~/ff-daemon.err &

# Save PID
echo $! > ~/ff-daemon.pid

# Start web server
nohup node dist/web/server.js > ~/ff-web.out 2> ~/ff-web.err &
echo $! > ~/ff-web.pid
```

### Stop Process

```bash
# Read PID and kill gracefully
pid=$(cat ~/ff-daemon.pid)
kill -TERM $pid

# Wait for shutdown
sleep 5

# Force kill if still running
kill -KILL $pid 2>/dev/null

# Remove PID file
rm ~/ff-daemon.pid
```

### Check Process Status

```bash
# Check if process is running
ps aux | grep "dist/daemon/daemon.js"

# Read PID from file
cat ~/ff-daemon.pid

# Check if PID exists
ps -p $(cat ~/ff-daemon.pid)
```

### Monitor with Watch

```bash
# Monitor process every 2 seconds
watch -n 2 'ps aux | grep "dist/daemon/daemon.js"'

# Monitor resource usage
watch -n 2 'ps aux | grep "dist/daemon/daemon.js" | awk '"'"'{print $3, $4, $11}'"'"

# Monitor with htop
htop -p $(cat ~/ff-daemon.pid)
```

---

## Process Monitoring

### Health Checks

```bash
# Check daemon health
curl http://localhost:28888/health

# Check web server health
curl http://localhost:8787/health

# With timeout
curl --max-time 5 http://localhost:28888/health
```

### Resource Monitoring

```bash
# CPU and memory usage
top -p $(cat ~/ff-daemon.pid)

# Detailed process info
ps aux | grep $(cat ~/ff-daemon.pid)

# Memory map
pmap -x $(cat ~/ff-daemon.pid)

# Open files
lsof -p $(cat ~/ff-daemon.pid)

# Network connections
lsof -i -P | grep $(cat ~/ff-daemon.pid)
```

### Automated Monitoring Script

```bash
#!/bin/bash
# monitor-ff.sh

DAEMON_PID=$(cat ~/ff-daemon.pid)
WEB_PID=$(cat ~/ff-web.pid)

check_process() {
    local pid=$1
    local name=$2

    if ps -p $pid > /dev/null; then
        echo "✓ $name is running (PID: $pid)"
    else
        echo "✗ $name is NOT running (PID: $pid)"
        return 1
    fi
}

check_health() {
    local url=$1
    local name=$2

    if curl --max-time 5 -s $url > /dev/null; then
        echo "✓ $name health check passed"
    else
        echo "✗ $name health check failed"
        return 1
    fi
}

check_process $DAEMON_PID "Daemon"
check_process $WEB_PID "Web Server"
check_health "http://localhost:28888/health" "Daemon"
check_health "http://localhost:8787/health" "Web Server"
```

---

## Graceful Shutdown

### Signal Handling

FF Terminal handles the following signals:

- **SIGTERM** - Graceful shutdown (recommended)
- **SIGINT** - Interrupt (Ctrl+C)
- **SIGHUP** - Reload configuration
- **SIGUSR2** - Cluster reload (PM2)

### Shutdown Sequence

```bash
# Graceful shutdown sequence
kill -TERM $(cat ~/ff-daemon.pid)

# Sequence:
# 1. Stop accepting new connections
# 2. Wait for active requests to complete
# 3. Close WebSocket connections
# 4. Save session state
# 5. Cleanup resources
# 6. Exit process
```

### Force Shutdown

```bash
# If graceful shutdown fails
kill -KILL $(cat ~/ff-daemon.pid)

# Equivalent to
kill -9 $(cat ~/ff-daemon.pid)
```

---

## Log Rotation

### PM2 Log Rotation

```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### logrotate (Linux)

Create `/etc/logrotate.d/ff-terminal`:

```
/home/username/pm2-logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 username username
    sharedscripts
    postrotate
        pm2 reload all
    endscript
}
```

---

## Troubleshooting

### Process Won't Start

```bash
# Check error logs
tail -f ~/pm2-logs/ff-daemon-error.log
# or
journalctl -u ff-terminal-daemon -n 50

# Check port availability
lsof -i:28888

# Check file permissions
ls -la dist/daemon/daemon.js

# Check Node.js version
node --version
```

### Process Crashing

```bash
# Check exit code
pm2 show ff-terminal-daemon

# View logs around crash
pm2 logs ff-terminal-daemon --n 100

# Check memory usage
pm2 monit

# Check for memory leaks
node --max-old-space-size=2048 dist/daemon/daemon.js
```

### Port Already in Use

```bash
# Find process using port
lsof -i:28888

# Kill process
kill -TERM <PID>

# Or use different port
FF_TERMINAL_PORT=28889 pm2 start ecosystem.config.js
```

### High CPU Usage

```bash
# Identify CPU-intensive operations
node --prof dist/daemon/daemon.js

# After running, analyze profile
node --prof-process isolate-*.log

# Increase Node.js heap size
NODE_OPTIONS=--max-old-space-size=2048 pm2 start ecosystem.config.js
```

---

## Best Practices

1. **Use process manager** - PM2, systemd, or launchd
2. **Enable automatic restart** - Set `autorestart: true`
3. **Monitor resources** - CPU, memory, and file handles
4. **Implement health checks** - HTTP endpoint monitoring
5. **Rotate logs** - Prevent disk space exhaustion
6. **Graceful shutdown** - Use SIGTERM, not SIGKILL
7. **Set resource limits** - Prevent resource exhaustion
8. **Back up workspace** - Protect session data

---

## Comparison

| Feature | PM2 | systemd | launchd |
|---------|-----|---------|---------|
| **Cross-platform** | ✅ | Linux only | macOS only |
| **Auto-restart** | ✅ | ✅ | ✅ |
| **Clustering** | ✅ | Manual | Manual |
| **Zero-downtime reload** | ✅ | Manual | Manual |
| **Log management** | Built-in | journal | Files |
| **Monitoring UI** | ✅ | CLI only | CLI only |
| **Startup on boot** | ✅ | ✅ | ✅ |
| **Resource limits** | ✅ | ✅ | ✅ |

**Recommended:** Use PM2 for cross-platform deployments, systemd for Linux servers, launchd for macOS development.
