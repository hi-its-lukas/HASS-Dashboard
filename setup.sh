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

# Create .env.local if not exists
if [ ! -f .env.local ]; then
    echo ""
    echo -e "${YELLOW}Erstelle Konfigurationsdatei...${NC}"
    cp .env.example .env.local
    echo -e "${GREEN}.env.local erstellt ✓${NC}"
    echo ""
    echo -e "${YELLOW}WICHTIG: Bearbeite .env.local mit deinen Home Assistant Daten:${NC}"
    echo "  nano .env.local"
    echo ""
    echo "Erforderliche Einstellungen:"
    echo "  NEXT_PUBLIC_HA_WS_URL=wss://dein-home-assistant:8123/api/websocket"
    echo "  HA_TOKEN=dein-long-lived-access-token"
    echo "  NEXT_PUBLIC_USE_MOCK=false"
    echo ""
fi

# Install dependencies
echo -e "${YELLOW}Installiere Abhängigkeiten...${NC}"
npm ci --legacy-peer-deps
echo -e "${GREEN}Abhängigkeiten installiert ✓${NC}"

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
echo "1. Konfiguration anpassen (falls noch nicht geschehen):"
echo "   nano .env.local"
echo ""
echo "2. Dashboard starten:"
echo "   npm start"
echo ""
echo "3. Für dauerhaften Betrieb (mit PM2):"
echo "   sudo npm install -g pm2"
echo "   pm2 start npm --name 'ha-dashboard' -- start"
echo "   pm2 startup"
echo "   pm2 save"
echo ""
echo "Dashboard URL: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
