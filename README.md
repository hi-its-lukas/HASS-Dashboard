# HA Dashboard

**Dein Smart Home auf einen Blick** - Eine moderne, benutzerfreundliche App für Home Assistant.

## Was ist HA Dashboard?

HA Dashboard ist eine **alternative Benutzeroberfläche für Home Assistant** mit modernem Apple Home-Design, die du auf Handy, Tablet oder Desktop als PWA installieren kannst.

### Features

- **Lichter steuern** - Alle Lampen nach Räumen sortiert
- **Rollläden bedienen** - Jalousien öffnen, schließen, stoppen
- **Heizung/Klima regeln** - Temperatur und Modi einstellen
- **Kameras ansehen** - Live-Feeds von Überwachungskameras
- **Türsprechanlage** - Video-Gegensprechanlage mit Türöffner
- **Familie orten** - Standorte mit Karte und Aktivitäten
- **Kalender** - Termine und Müllabfuhr-Erinnerungen
- **Energie** - Solar, Batterie und Stromverbrauch
- **UniFi Integration** - Protect Kameras und Access Türen

## Sicherheit

- **Interne Benutzerverwaltung** - Benutzername/Passwort Login mit Rollen (RBAC)
- **Kein Token im Browser** - Der HA-Token wird nur serverseitig verwendet
- **AES-256-GCM Verschlüsselung** - Tokens sind verschlüsselt gespeichert
- **WebSocket-Proxy** - Echtzeit-Updates ohne Token-Exposure
- **Session-basiert** - HttpOnly Cookies, 30 Tage Gültigkeit

## Schnellstart

### 1. Docker Container starten

```bash
git clone https://github.com/YOUR-USERNAME/ha-dashboard.git
cd ha-dashboard
docker compose up -d --build
```

#### Docker Desktop auf Mac (mDNS-Fix)

Docker Desktop auf Mac kann `.local` Adressen nicht auflosen. Falls du `homeassistant.local` verwenden mochtest:

```bash
# docker-compose.override.yml erstellen
cp docker-compose.override.yml.example docker-compose.override.yml

# IP-Adresse deines Home Assistant eintragen
nano docker-compose.override.yml
```

Ersetze `192.168.1.100` mit der IP deines Home Assistant. Diese Datei ist lokal und wird nicht ins Git hochgeladen.

**Alternative:** Verwende direkt die IP-Adresse in den HA-Einstellungen (z.B. `http://192.168.1.100:8123`).

### 2. Admin-Benutzer erstellen

```bash
docker exec -it ha-dashboard npm run create-admin
```

### 3. Home Assistant konfigurieren

1. Anmelden mit erstelltem Admin
2. **Einstellungen → Home Assistant**
3. HA-URL eingeben (z.B. `https://homeassistant.local:8123`)
4. Long-Lived Access Token aus HA einfügen (Profil → Sicherheit)
5. Speichern

### 4. Dashboard einrichten

1. **Einstellungen → Lichter** - Licht-Entities auswählen
2. **Einstellungen → Rollläden** - Cover-Entities auswählen
3. Weitere Module nach Bedarf konfigurieren

## Benutzerrollen

| Rolle | Beschreibung |
|-------|--------------|
| Owner | Vollzugriff, kann Admins ernennen |
| Admin | Benutzer verwalten, alle Module |
| Power User | Alle Module, keine Benutzerverwaltung |
| Viewer | Nur ansehen, keine Aktionen |
| Guest | Eingeschränkte Sicht |

## Technische Details

### Architektur

- **Frontend**: Next.js 14 mit App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + WebSocket Proxy
- **Datenbank**: SQLite via Prisma ORM
- **Echtzeit**: WebSocket-Proxy auf Port 6000 mit Polling-Fallback

### API-Authentifizierung

```
Client → Session Cookie → Server → Global HA Token → Home Assistant
```

Der HA-Token verlässt niemals den Server.

### Ports

| Port | Verwendung |
|------|------------|
| 5000 | Web-Interface |
| 6000 | WebSocket-Proxy |

## Entwicklung

```bash
# Dependencies installieren
npm install

# Datenbank initialisieren
npm run db:push
npm run db:seed

# Dev-Server starten
npm run dev

# WebSocket-Proxy starten (separates Terminal)
npm run ws-proxy
```

## Umgebungsvariablen

| Variable | Required | Beschreibung |
|----------|----------|--------------|
| `ENCRYPTION_KEY` | Ja | 32-Byte Hex für AES-256 |
| `SQLITE_URL` | Ja | SQLite Datenbankpfad |
| `APP_BASE_URL` | Prod | Öffentliche URL |
| `ALLOWED_HOSTS` | Nein | CSRF Allowlist |
| `WS_PROXY_PORT` | Nein | WebSocket Port (default: 6000) |

## Lizenz

MIT
