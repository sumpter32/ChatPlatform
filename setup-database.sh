#!/bin/bash

# Database Setup Script for ChatPlatform

echo "🗄️  Setting up ChatPlatform Database..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
else
    echo -e "${RED}❌ .env file not found! Please create it first.${NC}"
    exit 1
fi

# Check if variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database credentials not found in .env file!${NC}"
    echo "Please edit .env file and add:"
    echo "  DB_HOST=localhost"
    echo "  DB_USER=your_database_user"
    echo "  DB_PASSWORD=your_database_password"
    echo "  DB_NAME=your_database_name"
    exit 1
fi

echo -e "${YELLOW}📊 Running database migrations...${NC}"

# Run SQL files
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < sql/001_create_tables.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tables created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create tables${NC}"
    exit 1
fi

mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < sql/002_add_default_data.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Default data added${NC}"
else
    echo -e "${RED}❌ Failed to add default data${NC}"
    exit 1
fi

mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < sql/003_add_default_agent.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Default agent created${NC}"
else
    echo -e "${RED}❌ Failed to create default agent${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "📋 Next: Create an admin user by running:"
echo "   cd backend && node create-admin.js"
echo ""