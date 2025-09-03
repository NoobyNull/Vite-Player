# ⚡ Base44 App Player

A universal dynamic application player for Base44 applications with upload and multi-app management capabilities. Built specifically for Base44 platform applications.

![Base44 App Player Interface](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![Base44](https://img.shields.io/badge/Base44-SDK-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **🚀 Upload & Play**: Drag-and-drop Base44 application ZIP files
- **🎯 Dynamic Management**: Install, start, stop, and restart Base44 applications
- **🔧 Port Management**: Automatic port allocation (3000-3999 range)
- **⚙️ Configurable Modes**:
  - **Single App Mode**: Only one app runs at a time
  - **Multi App Mode**: Run multiple apps simultaneously
  - **Hybrid Mode**: User-defined rules
- **📱 Real-time Dashboard**: Beautiful web interface with WebSocket updates
- **🔄 Auto-restart**: Automatic dependency installation and app startup
- **📊 System Monitoring**: Resource usage and status tracking
- **🔒 Base44 Validation**: Automatic validation of @base44/sdk dependency

## 🎯 Quick Start

### ⚡ One-Line Installation (Recommended)

Install everything automatically with a single command:

```bash
# Using wget
wget -O- https://raw.githubusercontent.com/Base44/Base44-App-Player/main/quick-install.sh | bash

# Using curl
curl -fsSL https://raw.githubusercontent.com/Base44/Base44-App-Player/main/quick-install.sh | bash
```

This will:
- ✅ Check and install all dependencies (Node.js, npm, git)
- ✅ Clone the repository automatically
- ✅ Install application dependencies
- ✅ Configure and test the installation
- ✅ Optionally install as a system service
- ✅ Start the server immediately

### 📋 Manual Installation

If you prefer manual control:

#### Prerequisites
- **Node.js** v18+ and npm v8+
- **Debian/Ubuntu Linux** (tested on Debian 13)
- **Chrome/Chromium** for testing (optional)

#### Steps
1. **Clone Repository**:
   ```bash
   git clone https://github.com/Base44/Base44-App-Player.git
   cd Base44-App-Player
   ```

2. **Run Installer**:
   ```bash
   ./install.sh
   ```

3. **Or Install Manually**:
   ```bash
   npm install
   npm start
   ```

4. **Access Dashboard**:
   ```
   http://localhost:8081
   ```

## 📋 System Requirements

### Minimum Requirements
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space (for apps and dependencies)
- **CPU**: 2 cores minimum
- **Network**: Internet connection for dependency installation

### Software Dependencies
- Node.js v18.0.0+
- npm v8.0.0+
- Chrome/Chromium browser
- Debian-based Linux distribution

## 🚀 Usage Guide

### 1. Uploading Applications

1. **Prepare Your Base44 App**:
   - Export your Base44 application as ZIP
   - Ensure it contains `package.json` and `index.html`
   - @base44/sdk dependency must be present

2. **Upload Methods**:
   - **Drag & Drop**: Drop ZIP file onto upload area
   - **Browse**: Click "Browse Files" button
   - **API Upload**: Use `/api/upload` endpoint

3. **Installation Process**:
   ```
   ZIP Upload → Extraction → Validation → npm install → Ready
   ```

### 2. Managing Applications

#### Application Cards
Each installed app displays:
- **Name & Version**
- **Creation Date & Size**
- **Current Status** (Running/Stopped)
- **Port Information** (when running)
- **Action Buttons**

#### Available Actions
- **▶️ Start**: Launch the application on available port
- **⏹️ Stop**: Terminate the running application
- **🔄 Restart**: Stop and start the application
- **👁️ View**: Open application in new browser tab
- **🗑️ Delete**: Remove application permanently

### 3. Configuration

#### Settings Panel
Access via the **⚙️ Settings** button:

- **Port Range**: Set available port range (default: 3000-3999)
- **Max Concurrent Apps**: Limit simultaneous running apps (1-50)
- **Auto-start on Upload**: Automatically start apps after upload
- **App Mode**: Choose between Single, Multi, or Hybrid mode

#### App Modes Explained

**Single App Mode**:
- Only one application runs at a time
- Starting a new app stops the previous one
- Optimal for resource-constrained systems

**Multi App Mode**:
- Multiple applications run simultaneously
- Limited by "Max Concurrent Apps" setting
- Great for testing and development

**Hybrid Mode**:
- User-defined rules and preferences
- Advanced configuration options
- Maximum flexibility

## 🔧 API Documentation

### Upload Endpoints

#### POST `/api/upload`
Upload and install a new Base44 application.

**Request**:
```bash
curl -X POST -F "app=@myapp.zip" http://localhost:8081/api/upload
```

**Response**:
```json
{
  "success": true,
  "app": {
    "id": "uuid-string",
    "name": "My App",
    "version": "1.0.0",
    "status": "stopped"
  }
}
```

#### POST `/api/upload/validate`
Validate ZIP file without installing.

### Application Management

#### GET `/api/apps`
List all installed applications.

#### POST `/api/apps/:id/start`
Start a specific application.

#### POST `/api/apps/:id/stop`
Stop a running application.

#### DELETE `/api/apps/:id`
Delete an application.

### Settings

#### GET `/api/settings`
Retrieve current system settings.

#### POST `/api/settings`
Update system settings.

### System Status

#### GET `/api/status`
Get system status and running applications.

#### GET `/api/health`
Health check endpoint.

## 🔧 Advanced Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8081                    # Server port (default: 8080)
NODE_ENV=production         # Environment mode

# App Management
MAX_APPS=10                 # Override max concurrent apps
PORT_RANGE_MIN=3000        # Minimum port for apps
PORT_RANGE_MAX=3999        # Maximum port for apps
AUTO_START=true            # Auto-start apps on upload
```

### Directory Structure

```
base44-app-player/
├── server/                 # Backend Node.js application
│   ├── app.js             # Main server file
│   ├── routes/            # API routes
│   └── services/          # Business logic
├── client/                # Frontend dashboard
│   ├── index.html         # Main dashboard
│   └── assets/            # CSS, JS, images
├── apps/                  # Installed Base44 applications
├── uploads/               # Temporary upload storage
├── logs/                  # Application logs
└── config/                # Configuration files
```

### Running as System Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/base44-app-player.service
```

```ini
[Unit]
Description=Base44 App Player
After=network.target

[Service]
Type=simple
User=yax
WorkingDirectory=/home/yax/base44-app-player
ExecStart=/usr/bin/node server/app.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=8081

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable base44-app-player
sudo systemctl start base44-app-player
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::8080
```
**Solution**: Use a different port:
```bash
PORT=8081 npm start
```

#### npm Install Failures
**Symptoms**: Apps fail to install dependencies
**Solutions**:
1. Check internet connection
2. Clear npm cache: `npm cache clean --force`
3. Update Node.js/npm versions
4. Check disk space

#### Apps Won't Start
**Common Causes**:
- Missing dependencies in `package.json`
- Missing @base44/sdk dependency
- Invalid Vite configuration
- Port conflicts
- Insufficient permissions

**Debug Steps**:
1. Check application logs in `/logs/app.log`
2. Verify ZIP file contents
3. Test manual installation in apps directory

#### Memory Issues
**Symptoms**: System slowdown, apps crashing
**Solutions**:
1. Reduce "Max Concurrent Apps"
2. Switch to "Single App Mode"
3. Monitor system resources
4. Increase system RAM

### Log Locations

- **Application Logs**: `/logs/app.log`
- **Error Logs**: `/logs/error.log`
- **Console Output**: Terminal running the server

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:

1. **Check Logs**: Review application logs first
2. **System Status**: Visit `/api/health` endpoint
3. **Common Issues**: Review troubleshooting section
4. **System Resources**: Monitor CPU, RAM, and disk usage

## 🎯 Roadmap

### Planned Features
- **Docker Support**: Containerized deployment
- **App Templates**: Pre-built Base44 templates
- **Backup/Restore**: Application backup system
- **User Authentication**: Multi-user support
- **App Store**: Community app sharing
- **Performance Analytics**: Advanced monitoring

---

**Made with ❤️ for Base44 platform developers**

*Happy coding! 🚀*