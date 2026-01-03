#!/bin/bash

# HA Dashboard - Setup Script for Linux/Ubuntu/Raspberry Pi
# Usage: chmod +x setup.sh && ./setup.sh

set -e

echo "=========================================="
echo "  HA Dashboard - Linux Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Bitte nicht als root ausführen!${NC}"
    exit 1
fi

# Check Node.js
echo -e "${YELLOW}Überprüfe Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js nicht gefunden!${NC}"
    echo ""
    echo "Installiere Node.js mit:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
    echo "  sudo apt install -y nodejs"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js Version $NODE_VERSION ist zu alt. Mindestens Version 18 erforderlich.${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v) gefunden ✓${NC}"

# Check npm
echo -e "${YELLOW}Überprüfe npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm nicht gefunden!${NC}"
    exit 1
fi
echo -e "${GREEN}npm $(npm -v) gefunden ✓${NC}"

# Create .env.local for development
if [ ! -f .env.local ]; then
    echo ""
    echo -e "${YELLOW}Erstelle Entwicklungs-Konfigurationsdatei...${NC}"
    
    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    
    cat > .env.local << EOF
# HA Dashboard - Development Configuration
# For production (Docker), use .env instead

APP_BASE_URL=http://localhost:5000
ENCRYPTION_KEY=${ENCRYPTION_KEY}
DATABASE_URL=file:./data/ha-dashboard.db
NEXT_PUBLIC_USE_MOCK=false
EOF
    
    echo -e "${GREEN}.env.local erstellt ✓${NC}"
    echo ""
    echo -e "${YELLOW}HINWEIS: .env.local ist nur für lokale Entwicklung.${NC}"
    echo -e "${YELLOW}Für Docker/Produktion, erstelle eine .env Datei.${NC}"
    echo ""
fi

# Install dependencies
echo -e "${YELLOW}Installiere Abhängigkeiten...${NC}"
npm ci --legacy-peer-deps
echo -e "${GREEN}Abhängigkeiten installiert ✓${NC}"

# Generate Prisma client
echo -e "${YELLOW}Generiere Datenbank-Client...${NC}"
npx prisma generate
echo -e "${GREEN}Prisma Client generiert ✓${NC}"

# Create data directory
mkdir -p data

# Initialize database
echo -e "${YELLOW}Initialisiere Datenbank...${NC}"
npx prisma db push
echo -e "${GREEN}Datenbank initialisiert ✓${NC}"

# Build
echo ""
echo -e "${YELLOW}Baue Produktions-Build...${NC}"
npm run build
echo -e "${GREEN}Build erfolgreich ✓${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Nächste Schritte:"
echo ""
echo "1. Starte das Dashboard:"
echo "   npm start"
echo ""
echo "2. Öffne im Browser:"
echo "   http://localhost:5000"
echo ""
echo "3. Für dauerhaften Betrieb (mit PM2):"
echo "   sudo npm install -g pm2"
echo "   pm2 start npm --name 'ha-dashboard' -- start"
echo "   pm2 startup"
echo "   pm2 save"
echo ""
echo "Dashboard URL: http://$(hostname -I | awk '{print $1}'):5000"
echo ""
