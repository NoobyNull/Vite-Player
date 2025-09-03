#!/bin/bash

# GoogleAI App Player - Service Installation Script
# This script installs the GoogleAI App Player as a persistent system service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 GoogleAI App Player - Service Installation${NC}"
echo "============================================="

# Check if running as root for systemd installation
if [[ $EUID -eq 0 ]]; then
    echo -e "${RED}❌ Please run this script as a regular user, not root${NC}"
    echo "   The script will ask for sudo password when needed."
    exit 1
fi

# Check if systemd is available
if ! command -v systemctl &> /dev/null; then
    echo -e "${RED}❌ systemd not found. This script requires systemd.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Ensure dependencies are installed
echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
cd "$PROJECT_DIR"
npm install

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p apps uploads logs config

# Copy service file to systemd
echo -e "${YELLOW}🔧 Installing systemd service...${NC}"
sudo cp "$PROJECT_DIR/systemd/googleai-app-player.service" /etc/systemd/system/

# Reload systemd
echo -e "${YELLOW}🔄 Reloading systemd...${NC}"
sudo systemctl daemon-reload

# Enable the service
echo -e "${YELLOW}⚡ Enabling service for auto-start...${NC}"
sudo systemctl enable googleai-app-player.service

# Start the service
echo -e "${YELLOW}🚀 Starting GoogleAI App Player service...${NC}"
sudo systemctl start googleai-app-player.service

# Wait a moment for startup
sleep 3

# Check status
echo -e "${YELLOW}📊 Checking service status...${NC}"
if sudo systemctl is-active --quiet googleai-app-player.service; then
    echo -e "${GREEN}✅ GoogleAI App Player service is running!${NC}"
    echo ""
    echo -e "${BLUE}📱 Dashboard URL:${NC} http://localhost:8081"
    echo -e "${BLUE}🔧 Service status:${NC} sudo systemctl status googleai-app-player"
    echo -e "${BLUE}📋 View logs:${NC} sudo journalctl -u googleai-app-player -f"
    echo -e "${BLUE}🛑 Stop service:${NC} sudo systemctl stop googleai-app-player"
    echo -e "${BLUE}🚀 Start service:${NC} sudo systemctl start googleai-app-player"
    echo -e "${BLUE}🔄 Restart service:${NC} sudo systemctl restart googleai-app-player"
    echo -e "${BLUE}❌ Disable auto-start:${NC} sudo systemctl disable googleai-app-player"
    echo ""
    echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
    echo -e "The GoogleAI App Player will now start automatically on system boot."
else
    echo -e "${RED}❌ Service failed to start. Checking logs...${NC}"
    sudo journalctl -u googleai-app-player --no-pager -n 20
    exit 1
fi