# 🚀 GoogleAI App Player - Quick Setup Guide

## 📋 Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js v18+ installed (`node --version`)
- ✅ npm v8+ installed (`npm --version`)  
- ✅ Internet connection for dependency installation
- ✅ At least 2GB free RAM
- ✅ 5GB free disk space

## ⚡ 5-Minute Setup

### 1. Navigate to Project Directory
```bash
cd /home/yax/googleai-app-player
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
*If port 8080 is busy, use:* `PORT=8081 npm start`

### 4. Open Dashboard
Visit: **http://localhost:8081** (or your chosen port)

## 🎯 First Upload Test

1. **Get a Test Vite App**:
   - Create a simple Vite project: `npm create vite@latest test-app`
   - Or download from GoogleAI Studio
   - Zip the entire project folder

2. **Upload Process**:
   - Drag ZIP file to upload area
   - Wait for "App installed successfully" message
   - Click ▶️ Start button on the app card
   - Click 👁️ View to open the running app

## 🔧 Configuration Options

### Environment Setup
Create `.env` file (optional):
```bash
PORT=8081
NODE_ENV=production
MAX_APPS=5
AUTO_START=true
```

### Settings Panel
Access via ⚙️ Settings button:
- **Port Range**: 3000-3999 (modify as needed)
- **Max Apps**: 5 concurrent apps
- **Auto-start**: ✅ Enabled
- **Mode**: Single App (change to Multi for parallel apps)

## 🚨 Common Issues & Quick Fixes

### Port Already in Use
```bash
# Try different port
PORT=8082 npm start
```

### npm Install Errors
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

### Apps Won't Start
1. Check ZIP contains `package.json` with Vite dependency
2. Verify internet connection for npm install
3. Check logs: `tail -f logs/app.log`

### Chrome Setup (Optional)
For development testing:
```bash
/usr/bin/google-chrome-stable --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=/tmp/remote-profile &
```

## 🎛️ Development Mode

### Enable Debug Logging
```bash
DEBUG=true npm start
```

### Watch Mode (Development)
```bash
npm run dev  # If nodemon is installed
```

## 🏃‍♂️ Production Deployment

### 1. System Service (Recommended)
```bash
sudo cp systemd/googleai-app-player.service /etc/systemd/system/
sudo systemctl enable googleai-app-player
sudo systemctl start googleai-app-player
```

### 2. PM2 Process Manager
```bash
npm install -g pm2
pm2 start server/app.js --name googleai-app-player
pm2 startup
pm2 save
```

### 3. Docker Deployment (Coming Soon)
```bash
# Future release will include:
docker-compose up -d
```

## 📊 System Monitoring

### Check System Status
- **Health**: http://localhost:8081/api/health
- **Status**: http://localhost:8081/api/status  
- **Logs**: `tail -f logs/app.log`

### Resource Usage
```bash
# Monitor system resources
htop
# Check disk space
df -h
# Check port usage  
netstat -tulpn | grep :8081
```

## 🆘 Need Help?

1. **Check Logs**: `logs/app.log` and `logs/error.log`
2. **System Status**: Visit `/api/health` endpoint
3. **Restart Service**: `sudo systemctl restart googleai-app-player`
4. **Clean Reset**: Remove `apps/` and `config/` directories

## ✅ Success Indicators

You know everything is working when:
- ✅ Dashboard loads at http://localhost:8081
- ✅ Status shows "Online" (green dot)
- ✅ WebSocket connection established
- ✅ Settings panel opens and closes
- ✅ Upload area responds to drag/drop
- ✅ API endpoints return data: `/api/health`

---

**🎉 Congratulations!** Your GoogleAI App Player is ready to use!

Next steps:
1. Upload your first Vite application
2. Explore the different app modes  
3. Configure settings to your preference
4. Check out the full README.md for advanced features

*Happy app playing! 🚀*