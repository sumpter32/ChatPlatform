#!/bin/bash

# Start ChatPlatform in Production Mode

echo "🚀 Starting ChatPlatform in production mode..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file first by copying .env.production"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed!${NC}"
    echo "Install it with: npm install -g pm2"
    exit 1
fi

# Stop any existing instance
pm2 stop chatplatform-backend 2>/dev/null

# Start the application
echo -e "${YELLOW}🔧 Starting backend with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
echo -e "${YELLOW}🔧 Setting up auto-start on boot...${NC}"
pm2 startup

echo -e "${GREEN}✅ ChatPlatform is now running!${NC}"
echo ""
echo "📋 Useful PM2 commands:"
echo "   pm2 status          - Check app status"
echo "   pm2 logs            - View logs"
echo "   pm2 restart all     - Restart the app"
echo "   pm2 stop all        - Stop the app"
echo ""
echo "🌐 Your app should be accessible at: https://chat.wwjs.app"
echo ""