#!/bin/bash

# GoogleAI App Player - Complete Installation Script
# This script installs GoogleAI App Player from scratch on Debian/Ubuntu systems

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
NODE_VERSION="18"
INSTALL_DIR="/home/yax/googleai-app-player"
DEFAULT_PORT="8081"
SERVICE_NAME="googleai-app-player"

# Script info
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

clear
echo -e "${BLUE}"
cat << 'EOF'
   ____                   _         _    ___   _                 ____  _                       
  / ___| ___   ___   __ _| | ___   / \  |_ _| | |    ___  __ _  |  _ \| | __ _ _   _  ___ _ __ 
 | |  _ / _ \ / _ \ / _` | |/ _ \ / _ \  | |  | |   / _ \/ _` | | |_) | |/ _` | | | |/ _ \ '__|
 | |_| | (_) | (_) | (_| | |  __// ___ \ | |  | |  |  __/ (_| | |  __/| | (_| | |_| |  __/ |   
  \____|\___/ \___/ \__, |_|\___/_/   \_\___| |_|   \___|\__,_| |_|   |_|\__,_|\__, |\___|_|   
                    |___/                                                      |___/           
EOF
echo -e "${NC}"

echo -e "${CYAN}🚀 GoogleAI App Player - Complete Installation Script v${SCRIPT_VERSION}${NC}"
echo "=================================================================="
echo ""
echo -e "${YELLOW}This script will:${NC}"
echo "  ✅ Check and install system requirements"
echo "  ✅ Install Node.js and npm (if missing)"
echo "  ✅ Set up GoogleAI App Player"
echo "  ✅ Install application dependencies"
echo "  ✅ Configure the system"
echo "  ✅ Optionally install as a persistent service"
echo "  ✅ Test the installation"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Installation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔍 Starting installation process...${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    echo -e "${RED}❌ Please run this script as a regular user, not root${NC}"
    echo "   The script will ask for sudo password when needed."
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
is_port_in_use() {
    local port=$1
    if command_exists netstat; then
        netstat -tuln 2>/dev/null | grep -q ":$port "
    elif command_exists ss; then
        ss -tuln 2>/dev/null | grep -q ":$port "
    else
        return 1
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while is_port_in_use $port; do
        ((port++))
        if [[ $port -gt 9000 ]]; then
            echo "8080"
            return
        fi
    done
    echo $port
}

echo -e "${YELLOW}📋 Checking system requirements...${NC}"

# Check OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$ID" != "debian" && "$ID" != "ubuntu" && "$ID_LIKE" != *"debian"* ]]; then
        echo -e "${YELLOW}⚠️  Warning: This script is designed for Debian/Ubuntu systems.${NC}"
        echo "   Your system: $PRETTY_NAME"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Warning: Cannot detect OS version.${NC}"
fi

# Check if we're in the right directory or need to create it
if [[ "$SCRIPT_DIR" == "$INSTALL_DIR" && -f "$SCRIPT_DIR/package.json" ]]; then
    echo -e "${GREEN}✅ Found GoogleAI App Player in current directory${NC}"
    IS_SOURCE_DIR=true
else
    echo -e "${YELLOW}📁 Will install to: $INSTALL_DIR${NC}"
    IS_SOURCE_DIR=false
fi

# Update package list
echo -e "${YELLOW}🔄 Updating package list...${NC}"
sudo apt-get update -qq

# Install basic dependencies
echo -e "${YELLOW}📦 Installing basic dependencies...${NC}"
sudo apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Check and install Node.js
if command_exists node; then
    NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
        echo -e "${GREEN}✅ Node.js v$(node --version) is already installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js v$(node --version) found, but v${NODE_VERSION}+ required${NC}"
        NEED_NODE_INSTALL=true
    fi
else
    echo -e "${YELLOW}📦 Node.js not found, installing...${NC}"
    NEED_NODE_INSTALL=true
fi

if [[ "$NEED_NODE_INSTALL" == "true" ]]; then
    echo -e "${YELLOW}🔄 Installing Node.js v${NODE_VERSION}...${NC}"
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    
    # Install Node.js
    sudo apt-get install -y nodejs
    
    # Verify installation
    if command_exists node && command_exists npm; then
        echo -e "${GREEN}✅ Node.js v$(node --version) and npm v$(npm --version) installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install Node.js${NC}"
        exit 1
    fi
fi

# Check npm
if ! command_exists npm; then
    echo -e "${YELLOW}📦 Installing npm...${NC}"
    sudo apt-get install -y npm
fi

# Install additional system dependencies
echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
sudo apt-get install -y unzip curl wget git

# Optional: Install Chrome for development (ask user)
echo ""
read -p "Install Google Chrome for development/testing? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🌐 Installing Google Chrome...${NC}"
    
    # Add Google Chrome repository
    curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/googlechrome-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    
    sudo apt-get update -qq
    sudo apt-get install -y google-chrome-stable
    
    if command_exists google-chrome-stable; then
        echo -e "${GREEN}✅ Google Chrome installed successfully${NC}"
        CHROME_INSTALLED=true
    else
        echo -e "${YELLOW}⚠️  Chrome installation failed, continuing without it${NC}"
        CHROME_INSTALLED=false
    fi
else
    CHROME_INSTALLED=false
fi

# Create or setup application directory
if [[ "$IS_SOURCE_DIR" != "true" ]]; then
    echo -e "${YELLOW}📁 Creating application directory...${NC}"
    
    if [[ -d "$INSTALL_DIR" ]]; then
        echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists${NC}"
        read -p "Remove existing directory and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            echo -e "${RED}❌ Installation cancelled${NC}"
            exit 1
        fi
    fi
    
    mkdir -p "$INSTALL_DIR"
    
    # Copy files if running from a source directory
    if [[ -f "$SCRIPT_DIR/package.json" ]]; then
        echo -e "${YELLOW}📋 Copying application files...${NC}"
        cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR"/
        cd "$INSTALL_DIR"
    else
        echo -e "${RED}❌ Source files not found. Please run this script from the GoogleAI App Player directory.${NC}"
        exit 1
    fi
else
    cd "$INSTALL_DIR"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating application directories...${NC}"
mkdir -p apps uploads logs config systemd scripts

# Install npm dependencies
echo -e "${YELLOW}📦 Installing application dependencies...${NC}"
echo "   This may take a few minutes..."

if npm install --production; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    echo "   You may need to run: npm install --force"
    exit 1
fi

# Set proper permissions
echo -e "${YELLOW}🔒 Setting file permissions...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
chmod 755 "$INSTALL_DIR"
chown -R $USER:$USER "$INSTALL_DIR"

# Find available port
AVAILABLE_PORT=$(find_available_port $DEFAULT_PORT)
if [[ "$AVAILABLE_PORT" != "$DEFAULT_PORT" ]]; then
    echo -e "${YELLOW}⚠️  Port $DEFAULT_PORT is in use, using port $AVAILABLE_PORT${NC}"
fi

# Create environment configuration
echo -e "${YELLOW}⚙️  Creating configuration...${NC}"
cat > .env << EOF
# GoogleAI App Player Configuration
NODE_ENV=production
PORT=$AVAILABLE_PORT
MAX_APPS=5
AUTO_START=true
DEBUG=false

# Generated by installer on $(date)
EOF

# Test the installation
echo -e "${YELLOW}🧪 Testing installation...${NC}"

# Start the application in background for testing
echo -e "${BLUE}   Starting test server...${NC}"
PORT=$AVAILABLE_PORT timeout 10s npm start > test.log 2>&1 &
TEST_PID=$!

# Wait for startup
sleep 5

# Test health endpoint
if curl -s "http://localhost:$AVAILABLE_PORT/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application test successful${NC}"
    kill $TEST_PID 2>/dev/null || true
    rm -f test.log
    TEST_SUCCESS=true
else
    echo -e "${RED}❌ Application test failed${NC}"
    kill $TEST_PID 2>/dev/null || true
    if [[ -f test.log ]]; then
        echo -e "${YELLOW}   Error log:${NC}"
        tail -10 test.log
        rm -f test.log
    fi
    TEST_SUCCESS=false
fi

# Ask about service installation
echo ""
if [[ "$TEST_SUCCESS" == "true" ]]; then
    read -p "Install as a persistent system service? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        INSTALL_SERVICE=false
    else
        INSTALL_SERVICE=true
    fi
else
    echo -e "${YELLOW}⚠️  Skipping service installation due to test failure${NC}"
    INSTALL_SERVICE=false
fi

# Install service if requested
if [[ "$INSTALL_SERVICE" == "true" ]]; then
    echo -e "${YELLOW}🔧 Installing system service...${NC}"
    
    # Update service file with correct port
    sed -i "s/Environment=PORT=8081/Environment=PORT=$AVAILABLE_PORT/" systemd/googleai-app-player.service
    
    if ./scripts/install-service.sh; then
        echo -e "${GREEN}✅ Service installed successfully${NC}"
        SERVICE_INSTALLED=true
    else
        echo -e "${RED}❌ Service installation failed${NC}"
        SERVICE_INSTALLED=false
    fi
else
    SERVICE_INSTALLED=false
fi

# Final summary
echo ""
echo -e "${BLUE}=================================================================${NC}"
echo -e "${GREEN}🎉 GoogleAI App Player Installation Complete!${NC}"
echo -e "${BLUE}=================================================================${NC}"
echo ""

echo -e "${CYAN}📍 Installation Details:${NC}"
echo "   📁 Location: $INSTALL_DIR"
echo "   🌐 Port: $AVAILABLE_PORT"
echo "   👤 User: $USER"
echo "   📦 Node.js: $(node --version)"
echo "   📦 npm: $(npm --version)"

if [[ "$CHROME_INSTALLED" == "true" ]]; then
    echo "   🌐 Chrome: $(google-chrome-stable --version | cut -d' ' -f3)"
fi

echo ""
echo -e "${CYAN}🚀 How to Start:${NC}"

if [[ "$SERVICE_INSTALLED" == "true" ]]; then
    echo "   The service is already running!"
    echo "   🔧 Manage service: sudo systemctl start/stop/restart $SERVICE_NAME"
    echo "   📋 View logs: sudo journalctl -u $SERVICE_NAME -f"
else
    echo "   🏃 Manual start: cd $INSTALL_DIR && npm start"
    echo "   🔧 Custom port: PORT=9000 npm start"
fi

echo ""
echo -e "${CYAN}📱 Access Dashboard:${NC}"
echo "   🌐 URL: http://localhost:$AVAILABLE_PORT"
echo "   🏥 Health: http://localhost:$AVAILABLE_PORT/api/health"
echo "   📊 Status: http://localhost:$AVAILABLE_PORT/api/status"

echo ""
echo -e "${CYAN}📚 Documentation:${NC}"
echo "   📖 README: $INSTALL_DIR/README.md"
echo "   🚀 Quick Start: $INSTALL_DIR/SETUP.md"
echo "   🔌 API Docs: $INSTALL_DIR/API.md"

if [[ "$INSTALL_SERVICE" == "true" ]]; then
    echo "   🔄 Persistence: $INSTALL_DIR/PERSISTENCE.md"
fi

echo ""
echo -e "${CYAN}🔧 Configuration:${NC}"
echo "   ⚙️  Settings: Via web dashboard or $INSTALL_DIR/.env"
echo "   📁 Apps: $INSTALL_DIR/apps/"
echo "   📋 Logs: $INSTALL_DIR/logs/"

if [[ "$TEST_SUCCESS" != "true" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Warning: Installation test failed${NC}"
    echo "   Please check the logs and try starting manually:"
    echo "   cd $INSTALL_DIR && npm start"
fi

echo ""
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo "1. Visit http://localhost:$AVAILABLE_PORT to access the dashboard"
echo "2. Upload your first GoogleAI Studio Vite application (ZIP file)"
echo "3. Configure settings through the web interface"
echo "4. Enjoy managing your Vite applications!"

echo ""
echo -e "${PURPLE}Made with ❤️  for GoogleAI Studio developers${NC}"
echo -e "${BLUE}Happy coding! 🚀${NC}"

# Optional: Open browser
if [[ "$CHROME_INSTALLED" == "true" && "$TEST_SUCCESS" == "true" ]]; then
    echo ""
    read -p "Open dashboard in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        google-chrome-stable "http://localhost:$AVAILABLE_PORT" > /dev/null 2>&1 &
    fi
fi

exit 0