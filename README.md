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

Das Dashboard läuft auf `https://hoas-dashboard.familie-hengl.de` (intern und extern).

### Update

```bash
cd hass-dashboard
git pull
docker compose down
docker compose up -d --build
docker logs hass-dashboard -f
```

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
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Als Service starten:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 4. Cloudflare Tunnel Host Header (wichtig!)

Im Cloudflare Zero Trust Dashboard:

1. **Networks** → **Tunnels** → Tunnel auswählen
2. **Configure** → **Public Hostname** Tab
3. Route bearbeiten → **Additional application settings** aufklappen
4. **HTTP Host Header**: `dashboard.deinedomain.de` eintragen
5. Speichern

Dies stellt sicher, dass die App die richtige Domain erkennt.

### 5. Split-DNS einrichten

Damit OAuth intern und extern funktioniert:

| DNS | Ziel |
|-----|------|
| Extern (Cloudflare) | Cloudflare Tunnel |
| Intern (Pi-hole/Router/UniFi) | `192.168.x.x` (lokale IP) |

### 6. Selbstsigniertes Zertifikat (intern)

Caddy erstellt automatisch ein selbstsigniertes Zertifikat für `hoas-dashboard.familie-hengl.de`.

Beim ersten Aufruf im Browser erscheint eine Warnung - das ist normal:
1. **Chrome/Edge**: "Erweitert" → "Weiter zu ... (unsicher)"
2. **Safari**: "Details einblenden" → "diese Website besuchen"
3. **Firefox**: "Erweitert" → "Risiko akzeptieren"

Das Zertifikat ist nur für den lokalen Zugriff. Extern über Cloudflare wird das echte Zertifikat verwendet.

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
| Container | Debian Bookworm Slim |

### Warum Debian statt Alpine?

Das Docker-Image verwendet `node:20-bookworm-slim` statt Alpine weil:

- **Prisma + ARM64**: Alpine (musl libc) hat Kompatibilitätsprobleme mit Prisma auf ARM64
- **OpenSSL 3**: Debian Bookworm enthält OpenSSL 3.x, das Prisma benötigt
- **Raspberry Pi**: Funktioniert zuverlässig auf ARM64 ohne manuelle Fixes

## Sicherheit

- **Server-Side Token Storage** - Tokens nie im Browser
- **AES-256-GCM Verschlüsselung** - Tokens at-rest verschlüsselt
- **httpOnly Cookies** - Session nicht per JavaScript lesbar
- **OAuth PKCE** - Schutz vor Interception-Angriffen
- **365-Tage Sessions** - Lange Login-Dauer

## Datenpersistenz

Das `/data` Verzeichnis im Container speichert:

| Datei | Beschreibung |
|-------|-------------|
| `.encryption_key` | Auto-generierter AES-256 Schlüssel |
| `hass-dashboard.db` | SQLite Datenbank (Benutzer, Tokens, Einstellungen) |

Der Container:
- Erstellt `/data` automatisch falls nicht vorhanden
- Generiert den Encryption Key beim ersten Start
- Behebt Berechtigungsprobleme automatisch

**Keine manuelle Konfiguration erforderlich.**

## Troubleshooting

### OAuth funktioniert nicht

1. Split-DNS korrekt eingerichtet?
2. Gleiche Domain intern und extern?
3. Home Assistant erreichbar vom Dashboard-Server?

### Berechtigungsprobleme mit /data

Falls der Container mit "Permission denied" crasht:

```bash
# Option 1: Verzeichnis löschen und neu starten
docker compose down
rm -rf data/
docker compose up -d --build

# Option 2: Berechtigungen manuell fixen
sudo chown -R 1001:1001 ./data
docker compose restart
```

Der Container versucht automatisch die Berechtigungen zu fixen.
Falls das nicht funktioniert, erscheint eine klare Fehlermeldung im Log.

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
