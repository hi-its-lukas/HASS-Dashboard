# HA Dashboard Deployment Guide

## Übersicht

HA Dashboard verwendet **internes User-Management** mit Benutzername/Passwort-Authentifizierung. Ein globaler, vom Admin konfigurierter Home Assistant Long-Lived Access Token verbindet alle Benutzer mit der HA-Instanz.

## Sicherheitsarchitektur

- **Kein Token im Browser**: Der HA-Token wird serverseitig gespeichert und niemals an den Client gesendet
- **AES-256-GCM Verschlüsselung**: Token ist verschlüsselt in der Datenbank gespeichert
- **WebSocket-Proxy**: Separater Server-Proxy für Echtzeit-Verbindungen (Token bleibt serverseitig)
- **Session-basierte Auth**: HttpOnly Cookies, 30 Tage Gültigkeit
- **RBAC**: 5 Rollen mit 23 Berechtigungen

## Voraussetzungen

- Docker und Docker Compose installiert
- Home Assistant Instanz mit Long-Lived Access Token
- HTTPS-Zugang (Cloudflare Tunnel empfohlen)

## Umgebungsvariablen

### Erforderlich für Production

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `APP_BASE_URL` | Öffentliche URL des Dashboards | `https://dashboard.example.com` |
| `ENCRYPTION_KEY` | 32-Byte Hex-Schlüssel für Verschlüsselung | `openssl rand -hex 32` |
| `SQLITE_URL` | SQLite Datenbankpfad | `file:/data/ha-dashboard.db` |

### Optional

| Variable | Beschreibung |
|----------|--------------|
| `ALLOWED_HOSTS` | Komma-getrennte Liste erlaubter Hosts für CSRF |
| `ALLOW_DEFAULT_ADMIN` | `true` um Default-Admin in Production zu erlauben |
| `WS_PROXY_PORT` | Port für WebSocket-Proxy (default: 6000) |

### Nur Development

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_USE_MOCK` | Mock-Daten statt echter HA-Verbindung |

## Schnellstart

### 1. Encryption Key generieren

```bash
openssl rand -hex 32
```

### 2. docker-compose.yml erstellen

```yaml
services:
  ha-dashboard:
    image: ghcr.io/YOUR-USERNAME/ha-dashboard:latest
    container_name: ha-dashboard
    restart: unless-stopped
    ports:
      - "5000:5000"
      - "6000:6000"
    volumes:
      - ./data:/data
    environment:
      - APP_BASE_URL=https://dashboard.example.com
      - ENCRYPTION_KEY=<dein-generierter-key>
      - SQLITE_URL=file:/data/ha-dashboard.db
      - NODE_ENV=production
```

### 3. Container starten

```bash
docker compose up -d
```

### 4. Admin-Benutzer erstellen

In Production wird kein Default-Admin erstellt. Erstelle den initialen Admin:

```bash
docker exec -it ha-dashboard npm run create-admin
```

### 5. Home Assistant konfigurieren

1. Melde dich mit dem erstellten Admin an
2. Gehe zu **Einstellungen → Home Assistant**
3. Gib deine HA-URL ein (z.B. `https://homeassistant.local:8123`)
4. Erstelle in HA einen **Long-Lived Access Token** (Profil → Sicherheit → Langlebige Zugangstoken)
5. Füge den Token ein und speichere

## Architektur

### Datenbank (SQLite)

| Tabelle | Beschreibung |
|---------|--------------|
| `users` | Benutzerkonten mit Passwort-Hash |
| `sessions` | Aktive Sessions |
| `roles` / `permissions` | RBAC System |
| `system_config` | HA-Token und URL (verschlüsselt) |
| `dashboard_configs` | Pro-User Dashboard-Einstellungen |

### API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/auth/login` | POST | Login mit Benutzername/Passwort |
| `/api/auth/logout` | POST | Logout und Session löschen |
| `/api/me` | GET | Aktuelle Benutzerinfo |
| `/api/settings` | GET/POST | Dashboard-Konfiguration |
| `/api/ha/config` | GET/POST | HA-Verbindungseinstellungen (Admin) |
| `/api/ha/states` | GET | HA Entity States (Proxy) |
| `/api/ha/call-service` | POST | HA Service aufrufen (Proxy) |

### WebSocket-Proxy

Der WS-Proxy auf Port 6000 ermöglicht Echtzeit-Updates:

```
Browser → ws://localhost:6000/ws/ha → Server → HA WebSocket
```

- Client verbindet ohne Token
- Server validiert Session-Cookie
- Server verbindet zu HA mit globalem Token
- Bidirektionale Nachrichtenweiterleitung

### Polling-Fallback

Bei WS-Fehler automatischer Fallback auf Polling:
- Backoff: 5s → 10s → 20s → 60s
- Server-seitiger Cache (2s TTL)

## Updating

```bash
docker compose pull
docker compose up -d
```

## Troubleshooting

### Kein Admin vorhanden

```bash
docker exec -it ha-dashboard npm run create-admin
```

### HA-Verbindung schlägt fehl

1. Prüfe die HA-URL (HTTPS erforderlich von extern)
2. Prüfe ob der Token gültig ist
3. Teste mit `curl` von innerhalb des Containers

### WebSocket verbindet nicht

1. Prüfe ob Port 6000 erreichbar ist
2. Prüfe die Logs: `docker logs ha-dashboard`
3. Fallback auf Polling sollte automatisch greifen
