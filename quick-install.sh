#!/bin/bash

# GoogleAI App Player - One-Line Installer
# Usage: wget -O- https://raw.githubusercontent.com/YOUR_USERNAME/googleai-app-player/main/quick-install.sh | bash
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/googleai-app-player/main/quick-install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/NoobyNull/Vite-Player.git"
INSTALL_DIR="$HOME/Vite-Player"
NODE_VERSION="18"
DEFAULT_PORT="8081"

# Script info
SCRIPT_VERSION="1.0.0"

clear
echo -e "${BLUE}"
cat << 'EOF'
 ___    _____ _____ _____   ____  _       __     _______ ____
 \  \  / /_ _|_   _| ____| |  _ \| | __ _ \ \   / | ____|  _ \
  \  \/ / | |  | | |  _|   | |_) | |/ _` | \ \ / /|  _| | |_) |
   \  /  | |  | | | |___  |  __/| | (_| |  \ V / | |___|  _ <
    \/  |___| |_| |_____| |_|   |_|\__,_|   \_/  |_____|_| \_\
                                             
EOF
echo -e "${NC}"

echo -e "${CYAN}🚀 Vite Player - Quick Installer v${SCRIPT_VERSION}${NC}"
echo "================================================="
echo ""
echo -e "${YELLOW}This will automatically:${NC}"
echo "  🔍 Detect your system and check dependencies"
echo "  📦 Install Node.js, npm, git (if missing)"
echo "  📥 Clone Vite Player from GitHub"
echo "  ⚙️  Install and configure the application"
echo "  🚀 Start the server and show you the dashboard URL"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    echo -e "${RED}❌ Please run this installer as a regular user, not root${NC}"
    echo "   The script will ask for sudo password when needed."
    exit 1
fi

# Check if we can use sudo
if ! sudo -n true 2>/dev/null; then
    echo -e "${YELLOW}🔐 This installer requires sudo access for installing system packages.${NC}"
    echo "   You'll be prompted for your password when needed."
    echo ""
fi

echo -e "${BLUE}🔍 Starting automatic installation...${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
        OS_NAME="$PRETTY_NAME"
    elif command_exists lsb_release; then
        OS_ID=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        OS_VERSION=$(lsb_release -sr)
        OS_NAME=$(lsb_release -sd)
    else
        OS_ID="unknown"
        OS_VERSION="unknown"
        OS_NAME="Unknown Linux Distribution"
    fi
}

# Function to install packages on Debian/Ubuntu
install_debian_packages() {
    local packages=("$@")
    echo -e "${YELLOW}📦 Installing packages: ${packages[*]}${NC}"
    
    sudo apt-get update -qq
    sudo apt-get install -y "${packages[@]}"
}

# Function to install packages on CentOS/RHEL/Fedora
install_redhat_packages() {
    local packages=("$@")
    echo -e "${YELLOW}📦 Installing packages: ${packages[*]}${NC}"
    
    if command_exists dnf; then
        sudo dnf install -y "${packages[@]}"
    elif command_exists yum; then
        sudo yum install -y "${packages[@]}"
    else
        echo -e "${RED}❌ No package manager found (dnf/yum)${NC}"
        return 1
    fi
}

# Function to install Node.js via NodeSource
install_nodejs() {
    local version="$1"
    echo -e "${YELLOW}📦 Installing Node.js v${version}...${NC}"
    
    if [[ "$OS_ID" == "debian" || "$OS_ID" == "ubuntu" || "$OS_ID" == *"debian"* ]]; then
        # Debian/Ubuntu
        curl -fsSL "https://deb.nodesource.com/setup_${version}.x" | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS_ID" == "centos" || "$OS_ID" == "rhel" || "$OS_ID" == "fedora" ]]; then
        # CentOS/RHEL/Fedora
        curl -fsSL "https://rpm.nodesource.com/setup_${version}.x" | sudo bash -
        if command_exists dnf; then
            sudo dnf install -y nodejs npm
        else
            sudo yum install -y nodejs npm
        fi
    else
        echo -e "${YELLOW}⚠️  Unknown OS, trying generic Node.js installation...${NC}"
        # Try using the Node Version Manager as fallback
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install "$version"
        nvm use "$version"
    fi
}

# Function to find available port
find_available_port() {
    local port=$1
    while netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; do
        ((port++))
        if [[ $port -gt 9000 ]]; then
            port=8080
            break
        fi
    done
    echo $port
}

echo -e "${YELLOW}🔍 Detecting system...${NC}"
detect_os
echo -e "${GREEN}✅ Detected: $OS_NAME${NC}"

# Install basic dependencies
missing_packages=()

if [[ "$OS_ID" == "debian" || "$OS_ID" == "ubuntu" || "$OS_ID" == *"debian"* ]]; then
    # Check for basic tools
    if ! command_exists curl; then missing_packages+=("curl"); fi
    if ! command_exists wget; then missing_packages+=("wget"); fi
    if ! command_exists git; then missing_packages+=("git"); fi
    if ! command_exists unzip; then missing_packages+=("unzip"); fi
    
    # Install missing packages
    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        install_debian_packages "${missing_packages[@]}"
    fi
    
elif [[ "$OS_ID" == "centos" || "$OS_ID" == "rhel" || "$OS_ID" == "fedora" ]]; then
    # Check for basic tools
    if ! command_exists curl; then missing_packages+=("curl"); fi
    if ! command_exists wget; then missing_packages+=("wget"); fi
    if ! command_exists git; then missing_packages+=("git"); fi
    if ! command_exists unzip; then missing_packages+=("unzip"); fi
    
    # Install missing packages
    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        install_redhat_packages "${missing_packages[@]}"
    fi
else
    echo -e "${YELLOW}⚠️  Unknown OS, skipping system package installation${NC}"
    echo "   Please ensure you have: curl, wget, git, unzip"
fi

# Check and install Node.js
if command_exists node; then
    NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
        echo -e "${GREEN}✅ Node.js v$(node --version) already installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js v$(node --version) found, upgrading to v${NODE_VERSION}+${NC}"
        install_nodejs "$NODE_VERSION"
    fi
else
    echo -e "${YELLOW}📦 Installing Node.js v${NODE_VERSION}...${NC}"
    install_nodejs "$NODE_VERSION"
fi

# Verify Node.js installation
if ! command_exists node || ! command_exists npm; then
    echo -e "${RED}❌ Failed to install Node.js and npm${NC}"
    echo ""
    echo -e "${YELLOW}Manual installation required:${NC}"
    echo "1. Install Node.js from: https://nodejs.org/"
    echo "2. Re-run this installer"
    exit 1
fi

echo -e "${GREEN}✅ Node.js v$(node --version) and npm v$(npm --version)${NC}"

# Clone the repository
echo -e "${YELLOW}📥 Cloning GoogleAI App Player...${NC}"

if [[ -d "$INSTALL_DIR" ]]; then
    echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists${NC}"
    echo "   Backing up to ${INSTALL_DIR}.backup.$(date +%s)"
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%s)"
fi

if git clone "$REPO_URL" "$INSTALL_DIR"; then
    echo -e "${GREEN}✅ Repository cloned successfully${NC}"
else
    echo -e "${RED}❌ Failed to clone repository${NC}"
    echo ""
    echo -e "${YELLOW}Please check:${NC}"
    echo "1. Internet connection"
    echo "2. Repository URL: $REPO_URL"
    echo "3. GitHub access permissions"
    exit 1
fi

# Change to installation directory
cd "$INSTALL_DIR"

# Install dependencies
echo -e "${YELLOW}📦 Installing application dependencies...${NC}"
echo "   This may take a few minutes..."

if npm install --production; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    echo ""
    echo -e "${YELLOW}You can try manually:${NC}"
    echo "cd $INSTALL_DIR"
    echo "npm install"
    exit 1
fi

# Find available port
AVAILABLE_PORT=$(find_available_port $DEFAULT_PORT)
if [[ "$AVAILABLE_PORT" != "$DEFAULT_PORT" ]]; then
    echo -e "${YELLOW}⚠️  Port $DEFAULT_PORT busy, using port $AVAILABLE_PORT${NC}"
fi

# Create environment file
echo -e "${YELLOW}⚙️  Configuring application...${NC}"
cat > .env << EOF
NODE_ENV=production
PORT=$AVAILABLE_PORT
MAX_APPS=5
AUTO_START=true
DEBUG=false
EOF

# Set permissions
chmod +x scripts/*.sh install.sh 2>/dev/null || true

# Test the application
echo -e "${YELLOW}🧪 Testing installation...${NC}"

# Start the app in background
echo -e "${BLUE}   Starting server...${NC}"
PORT=$AVAILABLE_PORT nohup npm start > /tmp/googleai-app-player-test.log 2>&1 &
APP_PID=$!

# Wait for startup
sleep 8

# Test health endpoint
if curl -s "http://localhost:$AVAILABLE_PORT/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Installation test successful!${NC}"
    
    # Kill test instance
    kill $APP_PID 2>/dev/null || true
    sleep 2
    
    TEST_SUCCESS=true
else
    echo -e "${RED}❌ Installation test failed${NC}"
    
    # Kill test instance
    kill $APP_PID 2>/dev/null || true
    
    # Show logs
    if [[ -f /tmp/googleai-app-player-test.log ]]; then
        echo -e "${YELLOW}Error log:${NC}"
        tail -10 /tmp/googleai-app-player-test.log
    fi
    
    TEST_SUCCESS=false
fi

# Clean up test log
rm -f /tmp/googleai-app-player-test.log

# Ask about service installation
echo ""
if [[ "$TEST_SUCCESS" == "true" ]]; then
    echo -e "${CYAN}🎉 Installation completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Choose installation mode:${NC}"
    echo "1. 🚀 Start now (temporary - stops when terminal closes)"
    echo "2. 🔧 Install as system service (permanent - survives reboots)"
    echo ""
    read -p "Enter choice (1 or 2): " -n 1 -r
    echo
    
    if [[ $REPLY == "2" ]]; then
        echo -e "${YELLOW}🔧 Installing as system service...${NC}"
        if ./scripts/install-service.sh; then
            echo -e "${GREEN}✅ Service installed and started!${NC}"
            SERVICE_INSTALLED=true
        else
            echo -e "${RED}❌ Service installation failed, starting manually...${NC}"
            SERVICE_INSTALLED=false
        fi
    else
        SERVICE_INSTALLED=false
    fi
    
    # Start manually if service not installed
    if [[ "$SERVICE_INSTALLED" != "true" ]]; then
        echo -e "${YELLOW}🚀 Starting GoogleAI App Player...${NC}"
        echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
        echo ""
        
        # Start the app
        PORT=$AVAILABLE_PORT npm start &
        APP_PID=$!
        
        # Wait a moment for startup
        sleep 3
        
        echo -e "${GREEN}✅ GoogleAI App Player is running!${NC}"
    fi
else
    echo -e "${RED}❌ Installation completed but testing failed${NC}"
    echo ""
    echo -e "${YELLOW}You can try starting manually:${NC}"
    echo "cd $INSTALL_DIR"
    echo "npm start"
fi

# Final summary
echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}🎉 GoogleAI App Player Installation Complete!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

echo -e "${CYAN}📍 Installation Details:${NC}"
echo "   📁 Location: $INSTALL_DIR"
echo "   🌐 Port: $AVAILABLE_PORT"
echo "   👤 User: $(whoami)"
echo "   📦 Node.js: $(node --version)"
echo "   🖥️  System: $OS_NAME"

echo ""
echo -e "${CYAN}🚀 Access Your Dashboard:${NC}"
echo "   🌐 URL: http://localhost:$AVAILABLE_PORT"
echo "   🏥 Health: http://localhost:$AVAILABLE_PORT/api/health"

if [[ "$SERVICE_INSTALLED" == "true" ]]; then
    echo ""
    echo -e "${CYAN}🔧 Service Management:${NC}"
    echo "   📋 Status: sudo systemctl status googleai-app-player"
    echo "   🛑 Stop: sudo systemctl stop googleai-app-player"
    echo "   🚀 Start: sudo systemctl start googleai-app-player"
    echo "   🔄 Restart: sudo systemctl restart googleai-app-player"
    echo "   📜 Logs: sudo journalctl -u googleai-app-player -f"
fi

echo ""
echo -e "${CYAN}📚 Documentation:${NC}"
echo "   📖 Full Guide: $INSTALL_DIR/README.md"
echo "   🚀 Quick Setup: $INSTALL_DIR/SETUP.md"
echo "   🔌 API Docs: $INSTALL_DIR/API.md"

echo ""
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo "1. Visit http://localhost:$AVAILABLE_PORT to access dashboard"
echo "2. Upload your first GoogleAI Studio Vite application"
echo "3. Try both ZIP file and Base64 upload modes!"

echo ""
echo -e "${PURPLE}Made with ❤️  for GoogleAI Studio developers${NC}"
echo -e "${BLUE}Happy coding! 🚀${NC}"

# Keep the terminal open if running manually
if [[ "$SERVICE_INSTALLED" != "true" && "$TEST_SUCCESS" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}Server is running... Press Ctrl+C to stop${NC}"
    wait $APP_PID
fi

exit 0