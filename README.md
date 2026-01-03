# HASS Dashboard

Ein modernes, mobiles Dashboard für Home Assistant mit OAuth-Authentifizierung.

## Features

- **Login mit Home Assistant** - OAuth 2.0 mit PKCE
- **Multi-User Support** - Jeder Benutzer hat eigene Einstellungen
- **Verschlüsselte Token-Speicherung** - AES-256-GCM
- **Echtzeit-Updates** - WebSocket-Verbindung zu Home Assistant
- **PWA** - Als App auf iOS/Android installierbar

### Dashboard-Seiten

| Seite | Beschreibung |
|-------|-------------|
| Home | Uhrzeit, Wetter, Lichter, Stromverbrauch, Alarm, Anwesenheit |
| Energie | Solar, Batterie, Netz, Hausverbrauch mit Diagrammen |
| Sicherheit | Alarmsteuerung (Stay/Away/Night/Disarm) |
| Familie | Anwesenheitserkennung mit Aktivitätsdaten |
| Überwachung | Kamera-Events mit Personen-/Fahrzeugerkennung |

## Installation

### Voraussetzungen

- Docker & Docker Compose
- Cloudflare Account (für Tunnel)
- Home Assistant Installation

### 1. Repository klonen

```bash
git clone https://github.com/yourusername/hass-dashboard.git
cd hass-dashboard
```

### 2. Dashboard starten

```bash
docker compose up -d --build
```

Das Dashboard läuft auf `http://localhost:3000`.

### 3. Cloudflare Tunnel einrichten

```bash
# cloudflared installieren
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Login
cloudflared tunnel login

# Tunnel erstellen
cloudflared tunnel create hass-dashboard

# DNS-Eintrag hinzufügen
cloudflared tunnel route dns hass-dashboard dashboard.deinedomain.de
```

Tunnel-Konfiguration (`~/.cloudflared/config.yml`):

```yaml
tunnel: hass-dashboard
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: dashboard.deinedomain.de
    service: http://localhost:3000
  - service: http_status:404
```

Als Service starten:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 4. Split-DNS einrichten

Damit OAuth intern und extern funktioniert:

| DNS | Ziel |
|-----|------|
| Extern (Cloudflare) | Cloudflare Tunnel |
| Intern (Pi-hole/Router) | `192.168.x.x` (lokale IP) |

## Konfiguration

### Automatisch konfiguriert

| Was | Wo |
|-----|-----|
| Encryption Key | `./data/.encryption_key` |
| Datenbank | `./data/ha-dashboard.db` |
| OAuth URLs | Aus Request-Headers |

### Optional (.env)

```env
ENCRYPTION_KEY=dein-64-zeichen-hex-key
```

### Benutzer-Einstellungen

Nach dem Login unter **Einstellungen**:

- Home Assistant URL eingeben
- Entities zu Dashboard-Widgets zuordnen
- Räume und Personen konfigurieren

## Technologie

| Komponente | Technologie |
|------------|-------------|
| Framework | Next.js 14 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Datenbank | SQLite (Prisma) |
| Animationen | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |

## Sicherheit

- **Server-Side Token Storage** - Tokens nie im Browser
- **AES-256-GCM Verschlüsselung** - Tokens at-rest verschlüsselt
- **httpOnly Cookies** - Session nicht per JavaScript lesbar
- **OAuth PKCE** - Schutz vor Interception-Angriffen
- **365-Tage Sessions** - Lange Login-Dauer

## Troubleshooting

### OAuth funktioniert nicht

1. Split-DNS korrekt eingerichtet?
2. Gleiche Domain intern und extern?
3. Home Assistant erreichbar vom Dashboard-Server?

### Datenbank zurücksetzen

```bash
docker compose down
rm -rf data/
docker compose up -d --build
```

### Logs anzeigen

```bash
docker logs hass-dashboard -f
```

## Projektstruktur

```
hass-dashboard/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Geschützte Dashboard-Seiten
│   ├── api/                # API Routes
│   └── login/              # Login-Seite
├── components/             # React Komponenten
├── lib/                    # Utilities, Stores, Auth
├── prisma/                 # Datenbank-Schema
├── data/                   # Persistente Daten (Volume)
├── docker-compose.yml
└── Dockerfile
```

## Lizenz

MIT
