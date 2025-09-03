#!/bin/bash

# GoogleAI App Player - Uninstaller Script
# This script completely removes GoogleAI App Player from the system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/home/yax/googleai-app-player"
SERVICE_NAME="googleai-app-player"
CHROME_SERVICE_NAME="chrome-remote-debug"

echo -e "${RED}"
cat << 'EOF'
   ____                   _         _    ___   
  / ___| ___   ___   __ _| | ___   / \  |_ _|  
 | |  _ / _ \ / _ \ / _` | |/ _ \ / _ \  | |   
 | |_| | (_) | (_) | (_| | |  __// ___ \ | |   
  \____|\___/ \___/ \__, |_|\___/_/   \_\___| 
                    |___/                     
        _   _       _           _        _ _ 
       | | | |_ __ (_)_ __  ___| |_ __ _| | |
       | | | | '_ \| | '_ \/ __| __/ _` | | |
       | |_| | | | | | | | \__ \ || (_| | | |
        \___/|_| |_|_|_| |_|___/\__\__,_|_|_|
EOF
echo -e "${NC}"

echo -e "${BLUE}🗑️  GoogleAI App Player - Uninstaller${NC}"
echo "========================================="
echo ""
echo -e "${YELLOW}This will completely remove:${NC}"
echo "  🗂️  Application files ($INSTALL_DIR)"
echo "  🔧 System service ($SERVICE_NAME)"
echo "  🌐 Chrome debug service (if installed)"
echo "  📋 System service files"
echo "  📦 Service configurations"
echo ""
echo -e "${RED}⚠️  WARNING: This cannot be undone!${NC}"
echo -e "${RED}⚠️  All your uploaded apps will be deleted!${NC}"
echo ""

# Confirmation
read -p "Are you absolutely sure you want to uninstall? (type 'yes' to confirm): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    echo -e "${YELLOW}Uninstallation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  Starting uninstallation...${NC}"

# Stop and disable services
echo -e "${YELLOW}🛑 Stopping services...${NC}"

if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "   Stopping $SERVICE_NAME..."
    sudo systemctl stop "$SERVICE_NAME" || true
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "   Disabling $SERVICE_NAME..."
    sudo systemctl disable "$SERVICE_NAME" || true
fi

if systemctl is-active --quiet "$CHROME_SERVICE_NAME" 2>/dev/null; then
    echo "   Stopping $CHROME_SERVICE_NAME..."
    sudo systemctl stop "$CHROME_SERVICE_NAME" || true
fi

if systemctl is-enabled --quiet "$CHROME_SERVICE_NAME" 2>/dev/null; then
    echo "   Disabling $CHROME_SERVICE_NAME..."
    sudo systemctl disable "$CHROME_SERVICE_NAME" || true
fi

# Remove service files
echo -e "${YELLOW}📋 Removing service files...${NC}"

if [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
    echo "   Removing /etc/systemd/system/${SERVICE_NAME}.service"
    sudo rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
fi

if [[ -f "/etc/systemd/system/${CHROME_SERVICE_NAME}.service" ]]; then
    echo "   Removing /etc/systemd/system/${CHROME_SERVICE_NAME}.service"
    sudo rm -f "/etc/systemd/system/${CHROME_SERVICE_NAME}.service"
fi

# Reload systemd
echo -e "${YELLOW}🔄 Reloading systemd...${NC}"
sudo systemctl daemon-reload

# Kill any remaining processes
echo -e "${YELLOW}🔪 Killing remaining processes...${NC}"

# Kill Node.js processes related to GoogleAI App Player
pkill -f "googleai-app-player" 2>/dev/null || true
pkill -f "node.*server/app.js" 2>/dev/null || true

# Kill Chrome remote debug processes
pkill -f "chrome.*remote-debugging-port=9222" 2>/dev/null || true

# Remove application directory
if [[ -d "$INSTALL_DIR" ]]; then
    echo -e "${YELLOW}🗂️  Removing application directory...${NC}"
    echo "   Removing $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
else
    echo -e "${YELLOW}📁 Application directory not found (already removed?)${NC}"
fi

# Remove any remaining temp files
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -rf /tmp/chrome-remote-profile 2>/dev/null || true
rm -rf /tmp/remote-profile 2>/dev/null || true
rm -rf /tmp/googleai-app-player* 2>/dev/null || true

# Remove any cron jobs (if user added monitoring)
echo -e "${YELLOW}⏰ Checking for cron jobs...${NC}"
if crontab -l 2>/dev/null | grep -q "googleai-app-player\|check-health"; then
    echo "   Found GoogleAI App Player cron jobs"
    echo "   Please manually remove them with: crontab -e"
else
    echo "   No cron jobs found"
fi

# Check for running apps on typical ports
echo -e "${YELLOW}🔍 Checking for running apps...${NC}"
FOUND_PROCESSES=false

for port in {3000..3010} 8080 8081 9222; do
    if lsof -ti:$port 2>/dev/null; then
        FOUND_PROCESSES=true
        PID=$(lsof -ti:$port 2>/dev/null)
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo "   Process '$PROCESS' (PID: $PID) still running on port $port"
    fi
done

if [[ "$FOUND_PROCESSES" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some processes are still running on GoogleAI App Player ports${NC}"
    echo "   You may want to kill them manually if they're related to the app"
    echo "   Use: sudo kill <PID>"
fi

# Final summary
echo ""
echo -e "${GREEN}✅ GoogleAI App Player uninstallation complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of what was removed:${NC}"
echo "   🗂️  Application files: $INSTALL_DIR"
echo "   🔧 System service: $SERVICE_NAME"
echo "   🌐 Chrome service: $CHROME_SERVICE_NAME (if existed)"
echo "   📋 Service files from /etc/systemd/system/"
echo "   🧹 Temporary files"
echo ""

if [[ "$FOUND_PROCESSES" == "true" ]]; then
    echo -e "${YELLOW}⚠️  Manual cleanup may be needed:${NC}"
    echo "   • Some processes are still running"
    echo "   • Check and remove any custom cron jobs"
    echo "   • Check firewall rules if you added any"
fi

echo -e "${BLUE}🎯 To reinstall in the future:${NC}"
echo "   1. Download/extract GoogleAI App Player"
echo "   2. Run: ./install.sh"
echo ""
echo -e "${GREEN}Thank you for using GoogleAI App Player! 👋${NC}"

exit 0