#!/bin/bash

# HA Dashboard - Setup Script
# Usage: chmod +x setup.sh && ./setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}        ${GREEN}HA Dashboard Setup${NC}               ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker nicht gefunden!${NC}"
    echo ""
    echo "Installiere Docker mit:"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker gefunden"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose nicht gefunden!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker Compose gefunden"

# Create data directory
mkdir -p data

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}        ${GREEN}Setup abgeschlossen!${NC}              ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Nächste Schritte:${NC}"
echo ""
echo "1. Dashboard starten:"
echo -e "   ${CYAN}docker compose up -d --build${NC}"
echo ""
echo "2. Cloudflare Tunnel einrichten:"
echo "   - Ziel: http://localhost:3000"
echo "   - Öffentliche Domain in Cloudflare konfigurieren"
echo ""
echo "3. Im Browser öffnen:"
echo -e "   ${GREEN}https://deine-domain.de${NC}"
echo ""
