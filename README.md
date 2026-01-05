# HA Dashboard

Ein modernes, mobiles Home Assistant Dashboard mit Apple Home-inspiriertem Design.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED)

## Features

- **Apple Home Design** - Glassmorphism UI mit transluzenten Karten und Blur-Effekten
- **Progressive Web App** - Installierbar auf iPhone/Android mit Offline-Support
- **Multi-User** - Jeder Benutzer hat eigene Konfiguration und Hintergrundbild
- **OAuth 2.0** - Sichere Authentifizierung mit Home Assistant (PKCE)
- **Echtzeit-Updates** - WebSocket-Verbindung für Live-Statusänderungen
- **Responsive** - Mobile-first mit Desktop-Sidebar

### Seiten

| Seite | Beschreibung |
|-------|-------------|
| **Home** | Dashboard mit Wetter, Kalendervorschau, Müllabfuhr, Familien-Status |
| **Lichtquellen** | Alle Lichter ein-/ausschalten, nach Räumen gruppiert |
| **Rollos** | Jalousien/Rollläden steuern (öffnen/stoppen/schließen) |
| **Klima** | Heizung, Klimaanlage, Ventilatoren steuern |
| **Kalender** | Wochenansicht mit allen Home Assistant Kalendern |
| **Kameras** | Live-Kamera-Feeds mit Vollbild-Modus |
| **Energie** | Solar, Batterie, Netzverbrauch visualisiert |
| **Familie** | Personen-Standorte mit Karte und Aktivitätssensoren |
| **Aktionen** | Konfigurierbare Home Assistant Skripte ausführen |
| **Intercoms** | Türklingeln mit Live-Video, Sprechen und Türöffner |

## Voraussetzungen

- **Home Assistant** mit aktiviertem OAuth (siehe Konfiguration unten)
- **Docker** und **Docker Compose**
- **Cloudflare Tunnel** oder anderer Reverse Proxy für HTTPS

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/DEIN-USERNAME/ha-dashboard.git
cd ha-dashboard
```

### 2. Docker Container starten

```bash
docker-compose up -d
```

Das Dashboard ist dann unter `http://DEINE-IP:80` erreichbar.

### 3. Home Assistant konfigurieren

Füge folgendes zu deiner `configuration.yaml` hinzu:

```yaml
# Home Assistant OAuth Konfiguration
homeassistant:
  auth_providers:
    - type: homeassistant

# Erlaube das Dashboard als OAuth Client
http:
  cors_allowed_origins:
    - https://deine-dashboard-domain.de
```

Dann unter **Einstellungen > Geräte & Dienste > Integrationen > Anwendungsanmeldedaten**:

1. Klicke auf "Anwendung hinzufügen"
2. Name: `HA Dashboard`
3. Redirect URI: `https://deine-dashboard-domain.de/api/auth/callback`
4. Notiere Client ID (wird automatisch generiert)

### 4. Erste Anmeldung

1. Öffne das Dashboard im Browser
2. Gib deine Home Assistant URL ein (z.B. `https://homeassistant.local:8123`)
3. Klicke auf "Mit Home Assistant anmelden"
4. Autorisiere die App in Home Assistant
5. Konfiguriere deine Entitäten in den Einstellungen

## Docker Compose

```yaml
services:
  app:
    image: ghcr.io/DEIN-USERNAME/ha-dashboard:latest
    container_name: hass-dashboard
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/data
```

### Volumes

| Pfad | Beschreibung |
|------|-------------|
| `/data` | SQLite Datenbank, Hintergrundbilder, Encryption Key |

### Umgebungsvariablen (optional)

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `ENCRYPTION_KEY` | Auto-generiert | AES-256 Key für OAuth Token Verschlüsselung |
| `DATABASE_URL` | `file:/data/hass-dashboard.db` | SQLite Datenbankpfad |
| `NODE_ENV` | `production` | Node.js Umgebung |

## Update

```bash
# Neues Image pullen
docker-compose pull

# Container neu starten
docker-compose down
docker-compose up -d
```

## Architektur

```
+-------------------------------------------------------------+
|                         Browser                              |
|  +-------------+  +-------------+  +---------------------+  |
|  |   Next.js   |  |   Zustand   |  |  WebSocket Client   |  |
|  |   Frontend  |  |    Store    |  |  (Echtzeit-Updates) |  |
|  +------+------+  +------+------+  +----------+----------+  |
+---------+----------------+--------------------+--------------+
          |                |                    |
          v                v                    v
+-------------------------------------------------------------+
|                    Next.js API Routes                        |
|  +-------------+  +-------------+  +---------------------+  |
|  |  /api/auth  |  |  /api/ha/*  |  |  /api/config        |  |
|  |   (OAuth)   |  |  (HA Proxy) |  |  (User Settings)    |  |
|  +------+------+  +------+------+  +----------+----------+  |
+---------+----------------+--------------------+--------------+
          |                |                    |
          v                v                    v
+-----------------+  +-------------+  +---------------------+
|  SQLite + Prisma |  |    Home     |  |    Cloudflare       |
|  (User Data)     |  |  Assistant  |  |     Tunnel          |
+-----------------+  +-------------+  +---------------------+
```

### Technologie-Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **State**: Zustand
- **Datenbank**: SQLite via Prisma ORM
- **Auth**: OAuth 2.0 mit PKCE
- **PWA**: next-pwa mit Service Worker
- **Icons**: Lucide React
- **Charts**: Recharts
- **Maps**: Leaflet / React-Leaflet

### Sicherheit

- OAuth Tokens werden mit AES-256-GCM verschlüsselt gespeichert
- Tokens nie im Browser sichtbar (Server-side Proxy)
- HTTP-only Session Cookies
- Benutzer können nur eigene Hintergrundbilder sehen

## Einstellungen

Nach der Anmeldung kannst du in den **Einstellungen** konfigurieren:

### Dashboard
- Wetter-Entität
- Innentemperatur-Sensor
- Hintergrundbild hochladen

### Kalender
- Kalender für Vorschau auswählen
- Müllabfuhr-Kalender auswählen
- Wetter-Entität für Vorhersage

### Räume & Geräte
- Lichter
- Rollläden/Jalousien
- Klimageräte

### Personen
- Person-Entitäten für Familien-Seite

### Aktionen
- Home Assistant Skripte als Buttons

### Intercoms
- Türklingeln mit Kamera, Sprechen-URL und Türschloss

## Entwicklung

### Lokal starten

```bash
# Dependencies installieren
npm install

# Prisma Client generieren
npx prisma generate

# Entwicklungsserver starten
npm run dev
```

Das Dashboard läuft dann unter `http://localhost:5000`.

### Mock-Modus

Für Entwicklung ohne Home Assistant:

```bash
NEXT_PUBLIC_USE_MOCK=true npm run dev
```

### Docker Image bauen

```bash
docker build -t ha-dashboard .
```

## Fehlerbehebung

### "Token expired" nach Login
- Home Assistant OAuth Token ist abgelaufen
- Lösung: Erneut anmelden

### Karten werden nicht angezeigt
- Leaflet CSS muss geladen sein
- Prüfe Browser-Konsole auf Fehler

### WebSocket verbindet nicht
- Prüfe ob Home Assistant WebSocket API erreichbar ist
- Cloudflare Tunnel muss WebSocket unterstützen

### Keine Entitäten in Einstellungen
- OAuth Token hat nicht genug Berechtigungen
- Lösung: Neu anmelden und alle Berechtigungen erlauben

## Lizenz

MIT License - siehe [LICENSE](LICENSE)

## Beitragen

Pull Requests sind willkommen! Bitte erstelle zuerst ein Issue, um größere Änderungen zu diskutieren.
