# 🚀 Installation & Setup

Complete guide to installing and setting up GoogleAI App Player on your system.

## 📋 Prerequisites

Before starting, ensure your system meets these requirements:

### System Requirements
- **Operating System**: Linux (Debian/Ubuntu/CentOS)
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space for apps and dependencies
- **Network**: Internet connection for dependency installation

### Software Dependencies
- **Chrome/Chromium**: For application testing (optional but recommended)
- **Git**: For cloning the repository
- **curl or wget**: For quick installation scripts

### Check Prerequisites
Run these commands to verify your system:

```bash
# Check Node.js version
node --version
# Should output v18.x.x or higher

# Check npm version
npm --version
# Should output 8.x.x or higher

# Check available memory
free -h

# Check available disk space
df -h

# Check if ports are available
netstat -tulpn | grep :808
```

## ⚡ Quick Installation (Recommended)

### One-Line Installation Script

The fastest way to get started is using our automated installation script:

```bash
# Using wget
wget -O- https://raw.githubusercontent.com/NoobyNull/Vite-Player/main/quick-install.sh | bash

# Using curl
curl -fsSL https://raw.githubusercontent.com/NoobyNull/Vite-Player/main/quick-install.sh | bash
```

**This script will automatically:**
- ✅ Check and install all dependencies (Node.js, npm, git)
- ✅ Clone the repository to optimal location
- ✅ Install application dependencies
- ✅ Configure and test the installation
- ✅ Optionally install as a system service
- ✅ Start the server immediately
- ✅ Provide next steps guidance

### Script Options

The installation script supports several options:

```bash
# Install with custom directory
curl -fsSL https://raw.githubusercontent.com/NoobyNull/Vite-Player/main/quick-install.sh | bash -s -- --dir=/custom/path

# Skip system service installation
curl -fsSL https://raw.githubusercontent.com/NoobyNull/Vite-Player/main/quick-install.sh | bash -s -- --no-service

# Use custom port
curl -fsSL https://raw.githubusercontent.com/NoobyNull/Vite-Player/main/quick-install.sh | bash -s -- --port=9000

# Verbose output
curl -fsSL https://raw.githubusercontent.com/NoobyNull/Vite-Player/main/quick-install.sh | bash -s -- --verbose
```

## 🛠️ Manual Installation

If you prefer manual control over the installation process:

### Step 1: Install Prerequisites

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional dependencies
sudo apt-get install -y git curl wget build-essential

# Install Chrome (optional for testing)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable
```

#### CentOS/RHEL
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install additional dependencies
sudo yum install -y git curl wget gcc-c++ make

# Install Chrome (optional)
sudo yum install -y https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
```

### Step 2: Clone Repository

```bash
# Clone to recommended location
git clone https://github.com/NoobyNull/Vite-Player.git /home/$USER/googleai-app-player

# Navigate to directory
cd /home/$USER/googleai-app-player

# Verify repository contents
ls -la
```

### Step 3: Install Dependencies

```bash
# Install npm dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 4: Initial Configuration

```bash
# Create required directories
mkdir -p apps logs config uploads

# Set proper permissions
chmod 755 scripts/*.sh

# Create default configuration (optional)
cp config/default.json.example config/default.json 2>/dev/null || true
```

### Step 5: First Run Test

```bash
# Start the server
npm start

# Server should start on port 8080 (or 8081 if 8080 is busy)
# Look for output: "✅ Server running on http://localhost:8080"
```

### Step 6: Verify Installation

Open your browser and navigate to:
- **Dashboard**: `http://localhost:8080` (or your configured port)
- **Health Check**: `http://localhost:8080/api/health`
- **API Status**: `http://localhost:8080/api/status`

## 🔧 Alternative Installation Methods

### Using Local Installer Script

If you've already cloned the repository:

```bash
cd /home/$USER/googleai-app-player
./install.sh
```

This script provides an interactive installation with options for:
- Dependency checking and installation
- Service installation
- Port configuration
- Initial testing

### Docker Installation (Coming Soon)

Docker support is planned for future releases:

```bash
# Future release will support:
docker pull nooby/googleai-app-player:latest
docker-compose up -d
```

## 📊 Installation Verification

### Verification Checklist

After installation, verify everything is working:

```bash
# 1. Check service status
curl -s http://localhost:8080/api/health | jq '.'

# 2. Verify WebSocket connection
# Open browser developer tools and check for WebSocket connection

# 3. Test file upload area
# Drag a small file to the upload area (should show visual feedback)

# 4. Check log files
tail -f logs/app.log

# 5. Verify directory structure
tree -L 2 . || ls -la
```

### Expected Output

A successful installation should show:

```json
# Health check response
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 120,
  "apps": 0,
  "runningApps": 0
}
```

### Troubleshooting Installation

#### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :8080

# Use different port
PORT=8081 npm start
```

#### Permission Errors
```bash
# Fix ownership
sudo chown -R $USER:$USER /home/$USER/googleai-app-player

# Fix permissions
chmod -R 755 /home/$USER/googleai-app-player
chmod +x scripts/*.sh
```

#### npm Install Failures
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for Python/build tools (some dependencies need compilation)
sudo apt-get install -y python3 build-essential  # Ubuntu/Debian
sudo yum install -y python3 gcc-c++ make         # CentOS/RHEL
```

#### Network/Connectivity Issues
```bash
# Test internet connectivity
curl -I https://registry.npmjs.org/

# Use different npm registry if needed
npm config set registry https://registry.npmjs.org/
```

## 🚀 Post-Installation Setup

### 1. First Application Upload

Test your installation by uploading a sample Vite application:

```bash
# Create a test Vite app
npm create vite@latest test-app -- --template vanilla
cd test-app
npm install

# Zip the application
zip -r ../test-app.zip . -x node_modules/\* .git/\*

# Upload via web interface or API
cd ..
curl -X POST -F "app=@test-app.zip" http://localhost:8080/api/upload
```

### 2. Configure Settings

Access the settings panel in the web interface to configure:

- **Port Range**: Available ports for applications (default: 3000-3999)
- **Max Concurrent Apps**: Maximum simultaneous running apps
- **Auto-start**: Automatically start apps after upload
- **App Mode**: Single, Multi, or Hybrid mode

### 3. Optional: Install as System Service

For production use, install as a system service:

```bash
# Use the installation script
./scripts/install-service.sh

# Or manually
sudo cp systemd/googleai-app-player.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable googleai-app-player
sudo systemctl start googleai-app-player
```

## 📝 Configuration Files

### Environment Variables

Create a `.env` file for custom configuration:

```bash
# Server configuration
PORT=8080
NODE_ENV=production

# App management
MAX_APPS=5
PORT_RANGE_MIN=3000
PORT_RANGE_MAX=3999
AUTO_START=true

# Security
SESSION_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:8080

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Default Settings

The system uses these defaults if not configured:

```json
{
  "server": {
    "port": 8080,
    "host": "localhost"
  },
  "apps": {
    "maxConcurrent": 5,
    "portRange": {
      "min": 3000,
      "max": 3999
    },
    "autoStart": true,
    "mode": "single"
  },
  "directories": {
    "apps": "./apps",
    "uploads": "./uploads",
    "logs": "./logs",
    "config": "./config"
  }
}
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart service
sudo systemctl restart googleai-app-player  # If using systemd
# Or
npm start  # If running manually
```

### Backup Important Data

```bash
# Backup your applications and configuration
tar -czf backup-$(date +%Y%m%d).tar.gz apps/ config/ logs/

# Restore from backup
tar -xzf backup-20240115.tar.gz
```

## 🎯 Next Steps

After successful installation:

1. **[Read the Quick Start Guide](Quick-Start-Guide)** - Learn the basics
2. **[Explore the Dashboard](Dashboard-Guide)** - Master the web interface  
3. **[Check out the API](API-Documentation)** - Programmatic control
4. **[Configure for Production](Production-Deployment)** - Production setup
5. **[Set up Monitoring](Performance-&-Monitoring)** - System monitoring

## 🆘 Getting Help

If you encounter issues during installation:

1. **Check the logs**: `tail -f logs/app.log`
2. **Verify prerequisites**: Run the prerequisite check commands
3. **Review [Troubleshooting Guide](Troubleshooting-&-FAQ)**
4. **Check [GitHub Issues](https://github.com/NoobyNull/Vite-Player/issues)**
5. **Ask for help in [Discussions](https://github.com/NoobyNull/Vite-Player/discussions)**

---

**🎉 Congratulations!** Your GoogleAI App Player is now installed and ready to use!

*Next: [Quick Start Guide](Quick-Start-Guide)*