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
echo ""

# Check existing .env
if [ -f .env ]; then
    echo -e "${YELLOW}Eine .env Datei existiert bereits.${NC}"
    read -p "Überschreiben? (j/n): " overwrite
    if [ "$overwrite" != "j" ] && [ "$overwrite" != "J" ]; then
        echo ""
        echo "Setup abgebrochen. Starte mit:"
        echo -e "  ${CYAN}docker compose up -d --build${NC}"
        exit 0
    fi
    echo ""
fi

# Get Domain
echo -e "${YELLOW}Schritt 1/2: Domain${NC}"
echo "Gib deine Domain ein (z.B. dashboard.example.com)"
echo ""
read -p "Domain: " domain

if [ -z "$domain" ]; then
    echo -e "${RED}Fehler: Domain ist erforderlich!${NC}"
    exit 1
fi

# Get Email
echo ""
echo -e "${YELLOW}Schritt 2/2: E-Mail für Let's Encrypt${NC}"
echo "Wird für Zertifikats-Benachrichtigungen verwendet"
echo ""
read -p "E-Mail: " email

if [ -z "$email" ]; then
    echo -e "${RED}Fehler: E-Mail ist erforderlich!${NC}"
    exit 1
fi

# Write .env
cat > .env << EOF
DOMAIN=$domain
ACME_EMAIL=$email
EOF

# Create data directory
mkdir -p data

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}        ${GREEN}Setup abgeschlossen!${NC}              ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Domain:  ${GREEN}$domain${NC}"
echo -e "E-Mail:  ${GREEN}$email${NC}"
echo ""
echo -e "${YELLOW}Nächste Schritte:${NC}"
echo ""
echo "1. Split-DNS einrichten:"
echo "   - Öffentliches DNS: $domain → externe IP"
echo "   - Lokales DNS:      $domain → lokale Server-IP"
echo ""
echo "2. Port-Forwarding einrichten:"
echo "   - Port 80  → diesen Server"
echo "   - Port 443 → diesen Server"
echo ""
echo "3. Dashboard starten:"
echo -e "   ${CYAN}docker compose up -d --build${NC}"
echo ""
echo "4. Im Browser öffnen:"
echo -e "   ${GREEN}https://$domain${NC}"
echo ""
