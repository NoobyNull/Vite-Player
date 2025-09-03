# 🔄 GoogleAI App Player - Persistence Guide

Make your GoogleAI App Player run automatically on system startup and restart if it crashes.

## 🚀 Quick Persistent Setup

### Option 1: Automated Installation (Recommended)
```bash
cd /home/yax/googleai-app-player
./scripts/install-service.sh
```

This script will:
- ✅ Install the service automatically
- ✅ Enable auto-start on boot
- ✅ Start the service immediately
- ✅ Show you all management commands

### Option 2: Manual Installation
```bash
# Copy service file
sudo cp systemd/googleai-app-player.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable googleai-app-player.service
sudo systemctl start googleai-app-player.service
```

## 📋 Service Management Commands

Once installed, use these commands to manage the service:

### Basic Operations
```bash
# Check service status
sudo systemctl status googleai-app-player

# Start the service
sudo systemctl start googleai-app-player

# Stop the service
sudo systemctl stop googleai-app-player

# Restart the service
sudo systemctl restart googleai-app-player

# Reload configuration
sudo systemctl reload googleai-app-player
```

### Auto-Start Management
```bash
# Enable auto-start on boot (default after installation)
sudo systemctl enable googleai-app-player

# Disable auto-start on boot
sudo systemctl disable googleai-app-player

# Check if auto-start is enabled
sudo systemctl is-enabled googleai-app-player
```

### Logging and Monitoring
```bash
# View recent logs
sudo journalctl -u googleai-app-player

# Follow logs in real-time
sudo journalctl -u googleai-app-player -f

# View last 50 log entries
sudo journalctl -u googleai-app-player -n 50

# View logs from today
sudo journalctl -u googleai-app-player --since today
```

## 🌐 Chrome Remote Debug Persistence (Optional)

For development and testing, you can also make Chrome remote debugging persistent:

### Install Chrome Service
```bash
# Copy Chrome service file
sudo cp systemd/chrome-remote-debug.service /etc/systemd/system/

# Enable and start Chrome service
sudo systemctl daemon-reload
sudo systemctl enable chrome-remote-debug.service
sudo systemctl start chrome-remote-debug.service
```

### Chrome Service Management
```bash
# Status and logs
sudo systemctl status chrome-remote-debug
sudo journalctl -u chrome-remote-debug -f

# Control
sudo systemctl start/stop/restart chrome-remote-debug
```

## 🔧 Service Configuration

### Environment Variables
Edit the service file to customize settings:
```bash
sudo nano /etc/systemd/system/googleai-app-player.service
```

Available environment variables:
```ini
Environment=NODE_ENV=production
Environment=PORT=8081
Environment=MAX_APPS=5
Environment=DEBUG=false
Environment=AUTO_START=true
```

After editing, reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart googleai-app-player
```

### Port Configuration
Default service runs on port **8081**. To change:

1. Edit service file:
   ```bash
   sudo nano /etc/systemd/system/googleai-app-player.service
   ```

2. Change the PORT environment variable:
   ```ini
   Environment=PORT=9000
   ```

3. Reload and restart:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart googleai-app-player
   ```

## 🔒 Security Features

The service runs with enhanced security:
- ✅ **Non-root user**: Runs as `yax` user
- ✅ **Read-only system**: Can't modify system files
- ✅ **Limited file access**: Only specific directories writable
- ✅ **No new privileges**: Can't escalate privileges
- ✅ **Private temp**: Isolated temporary directories
- ✅ **Resource limits**: File descriptor limits applied

## 📊 Monitoring and Health Checks

### Built-in Health Endpoint
The service provides health monitoring at:
```
http://localhost:8081/api/health
```

### Health Check Script
Create a monitoring script:
```bash
#!/bin/bash
# /home/yax/check-health.sh

HEALTH_URL="http://localhost:8081/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$RESPONSE" -eq 200 ]; then
    echo "✅ GoogleAI App Player is healthy"
    exit 0
else
    echo "❌ GoogleAI App Player is unhealthy (HTTP $RESPONSE)"
    # Optionally restart the service
    # sudo systemctl restart googleai-app-player
    exit 1
fi
```

### Automatic Health Monitoring
Add to crontab for periodic checks:
```bash
# Check every 5 minutes
*/5 * * * * /home/yax/check-health.sh >> /home/yax/health-check.log 2>&1
```

## 🚨 Troubleshooting Persistent Service

### Service Won't Start
```bash
# Check detailed status
sudo systemctl status googleai-app-player -l

# Check recent logs
sudo journalctl -u googleai-app-player --since "10 minutes ago"

# Check if port is available
sudo lsof -i :8081
```

### Common Issues

#### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :8081

# Kill the process (replace PID)
sudo kill <PID>

# Or change the port in service file
sudo nano /etc/systemd/system/googleai-app-player.service
```

#### Permission Issues
```bash
# Check file ownership
ls -la /home/yax/googleai-app-player

# Fix ownership if needed
sudo chown -R yax:yax /home/yax/googleai-app-player
```

#### Dependencies Missing
```bash
# Reinstall dependencies
cd /home/yax/googleai-app-player
npm install

# Restart service
sudo systemctl restart googleai-app-player
```

### Service Recovery
If the service is in a failed state:
```bash
# Reset failed state
sudo systemctl reset-failed googleai-app-player

# Restart service
sudo systemctl restart googleai-app-player
```

## 🔄 Automatic Restart Behavior

The service is configured to:
- ✅ **Always restart** if it crashes or stops unexpectedly
- ✅ **Wait 3 seconds** before restarting (prevents rapid restart loops)
- ✅ **Timeout after 30 seconds** if startup takes too long
- ✅ **Log all restart events** to system journal

### Restart Policies
```ini
Restart=always          # Always restart
RestartSec=3           # Wait 3 seconds before restart
TimeoutStartSec=30     # 30 second startup timeout
TimeoutStopSec=30      # 30 second shutdown timeout
```

## 📈 Performance and Resource Management

### Resource Limits
The service includes resource limits:
```ini
LimitNOFILE=65536      # Max open files
```

### Memory Management
Monitor memory usage:
```bash
# Check memory usage of the service
sudo systemctl show googleai-app-player --property=MemoryCurrent

# System memory overview
free -h
```

### CPU Monitoring
```bash
# Monitor CPU usage
top -p $(pgrep -f "node.*googleai-app-player")

# Or use htop
htop -p $(pgrep -f "node.*googleai-app-player")
```

## ✅ Verification Checklist

After setting up persistence, verify:

- [ ] Service is active: `sudo systemctl is-active googleai-app-player`
- [ ] Service is enabled: `sudo systemctl is-enabled googleai-app-player`
- [ ] Dashboard accessible: `curl -s http://localhost:8081/api/health`
- [ ] Logs are clean: `sudo journalctl -u googleai-app-player --since "1 hour ago"`
- [ ] Service survives reboot: `sudo reboot` (then check after restart)

## 🎯 Success Indicators

Your persistent setup is working when:
- ✅ Service starts automatically after system reboot
- ✅ Dashboard is immediately accessible after boot
- ✅ Service restarts automatically if Node.js crashes
- ✅ Logs show clean startup and operation
- ✅ Apps remain manageable through the interface
- ✅ Health endpoint returns HTTP 200

---

**🎉 Congratulations!** Your GoogleAI App Player is now persistent and will survive reboots and crashes!

*For additional help, check the main [README.md](README.md) or [SETUP.md](SETUP.md)*