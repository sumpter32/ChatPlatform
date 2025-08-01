#!/bin/bash

# ChatPlatform CloudPanel Installation Script
# For chat.wwjs.app

echo "🚀 Starting ChatPlatform Installation..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as the site user
if [ "$USER" = "root" ]; then
    echo "❌ Please run this script as your site user, not root!"
    exit 1
fi

# Step 1: Install Node.js dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd backend
npm install --production

echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd ../frontend
npm install

# Step 2: Build frontend
echo -e "${YELLOW}🔨 Building frontend for production...${NC}"
npm run build

# Step 3: Copy .env file
cd ..
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cp .env.production .env
    echo -e "${GREEN}✅ Created .env file - PLEASE EDIT IT WITH YOUR DATABASE DETAILS!${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Step 4: Create required directories
echo -e "${YELLOW}📁 Creating upload directories...${NC}"
mkdir -p backend/uploads/agents
mkdir -p backend/uploads/platform
chmod 755 backend/uploads
chmod 755 backend/uploads/agents
chmod 755 backend/uploads/platform

# Step 5: Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔧 Installing PM2...${NC}"
    npm install -g pm2
fi

echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file with your database details"
echo "2. Run: ./setup-database.sh"
echo "3. Run: ./start-production.sh"
echo ""