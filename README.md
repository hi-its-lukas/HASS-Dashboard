# HA Dashboard

**Dein Smart Home auf einen Blick** - Eine schöne, einfach zu bedienende App für Home Assistant.

## Was ist HA Dashboard?

HA Dashboard ist eine **alternative Benutzeroberfläche für Home Assistant**. Statt der Standard-Oberfläche von Home Assistant bekommst du ein modernes Dashboard im Apple Home-Stil, das du auf deinem Handy oder Tablet als App installieren kannst.

### Das kann die App:

- **Lichter steuern** - Alle Lampen im Haus ein-/ausschalten, nach Räumen sortiert
- **Rollläden bedienen** - Jalousien öffnen, schließen oder stoppen
- **Heizung/Klima regeln** - Temperatur einstellen, Modi wechseln
- **Kameras ansehen** - Live-Bild von allen Überwachungskameras
- **Türklingeln** - Video-Gegensprechanlage mit Türöffner
- **Familie orten** - Wo sind alle gerade? Mit Karte und Aktivitätsdaten
- **Kalender** - Termine und Müllabfuhr-Erinnerungen
- **Wetter** - Aktuelle Temperatur und 5-Tage-Vorhersage
- **Energie** - Solar, Batterie und Stromverbrauch visualisiert
- **Aktionen** - Beliebige Home Assistant Skripte per Knopfdruck ausführen

### Warum HA Dashboard statt Home Assistant App?

| HA Dashboard | Home Assistant App |
|--------------|-------------------|
| Schönes Apple Home Design | Funktional, aber technisch |
| Einfache Bedienung | Viele Optionen können überfordern |
| Für die ganze Familie | Eher für Technik-Fans |
| Schneller Zugriff auf das Wichtigste | Zeigt alles auf einmal |

---

## Was brauchst du?

1. **Home Assistant** - Muss bereits laufen (z.B. auf Raspberry Pi, NAS, oder VM)
2. **Docker** - Zum Ausführen der App
3. **HTTPS-Zugang** - Cloudflare Tunnel oder anderer Reverse Proxy

---

## Installation (Schritt für Schritt)

### Schritt 1: Docker Compose erstellen

Erstelle einen Ordner und darin eine `docker-compose.yml` Datei:

```yaml
services:
  ha-dashboard:
    image: ghcr.io/DEIN-USERNAME/ha-dashboard:latest
    container_name: ha-dashboard
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./data:/data
```

### Schritt 2: Container starten

```bash
docker-compose up -d
```

Die App läuft jetzt unter `http://DEINE-IP:80`.

### Schritt 3: HTTPS einrichten (wichtig!)

OAuth funktioniert nur über HTTPS. Du brauchst entweder:

- **Cloudflare Tunnel** (empfohlen, kostenlos)
- Oder einen anderen Reverse Proxy mit SSL-Zertifikat

Nach dem Einrichten hast du eine Domain wie `https://dashboard.deine-domain.de`.

### Schritt 4: Home Assistant vorbereiten

In Home Assistant musst du die App als OAuth-Client registrieren:

1. Gehe zu **Einstellungen > Geräte & Dienste**
2. Klicke oben auf **Anwendungsanmeldedaten**
3. Klicke auf **Anwendung hinzufügen**
4. Fülle aus:
   - **Name:** `HA Dashboard`
   - **Redirect URI:** `https://dashboard.deine-domain.de/api/auth/callback`
5. Klicke auf **Erstellen**

Die Client ID wird automatisch generiert - du musst sie dir nicht merken.

### Schritt 5: Erste Anmeldung

1. Öffne `https://dashboard.deine-domain.de` im Browser
2. Gib deine **Home Assistant URL** ein (z.B. `https://homeassistant.local:8123`)
3. Klicke auf **Mit Home Assistant anmelden**
4. Du wirst zu Home Assistant weitergeleitet - klicke auf **Autorisieren**
5. Fertig! Du bist eingeloggt.

---

## Erste Einrichtung in der App

Nach dem Login ist das Dashboard noch leer. Du musst zuerst einstellen, welche Geräte angezeigt werden sollen.

### Einstellungen öffnen

Klicke auf das **Zahnrad-Symbol** in der Sidebar (Desktop) oder in der unteren Navigation (Handy).

### Was muss eingestellt werden?

#### 1. Dashboard (Startseite)

| Einstellung | Was eintragen | Beispiel |
|-------------|---------------|----------|
| Wetter-Entität | Deine Wetter-Integration | `weather.home` |
| Innentemperatur | Temperatursensor für drinnen | `sensor.wohnzimmer_temperatur` |
| Hintergrundbild | Optional: Eigenes Foto hochladen | - |

#### 2. Kalender

| Einstellung | Was eintragen | Beispiel |
|-------------|---------------|----------|
| Kalender-Vorschau | Kalender für die Startseite | `calendar.familie` |
| Müllabfuhr-Kalender | Kalender mit Abfuhrterminen | `calendar.abfall` |

#### 3. Lichter

Wähle alle Licht-Entitäten aus, die angezeigt werden sollen. Die App gruppiert sie automatisch nach Räumen basierend auf dem Namen.

**Beispiel:** `light.wohnzimmer_decke` wird automatisch unter "Wohnzimmer" einsortiert.

#### 4. Rollläden

Wähle alle Cover-Entitäten (Jalousien, Rollläden, Garagentore) aus.

#### 5. Klima

Wähle Klimageräte, Heizungen oder Ventilatoren aus (`climate.*` Entitäten).

#### 6. Kameras

Wähle alle Kamera-Entitäten aus (`camera.*`).

#### 7. Personen (Familie)

Wähle Person-Entitäten aus (`person.*`). Die App zeigt dann:
- Aktueller Standort auf der Karte
- Zuhause/Unterwegs Status
- Aktivitätssensoren (Schritte, Batterie) falls vorhanden

#### 8. Aktionen (optional)

Wähle Home Assistant Skripte aus (`script.*`), die als Buttons auf der Aktionen-Seite erscheinen sollen.

**Beispiele:**
- `script.gute_nacht` - Alle Lichter aus, Rollläden runter
- `script.staubsauger_starten` - Saugroboter losschicken

#### 9. Intercoms / Türklingeln (optional)

Für jede Gegensprechanlage:

| Feld | Beschreibung |
|------|--------------|
| Name | Anzeigename (z.B. "Haustür") |
| Slug | URL-Pfad (z.B. "haustuere") |
| Kamera | Kamera-Entität der Klingel |
| Sprechen-URL | URL zum Sprechen (falls unterstützt) |
| Türschloss | Lock-Entität zum Öffnen |

---

## App auf dem Handy installieren

HA Dashboard ist eine **Progressive Web App (PWA)** - du kannst sie wie eine echte App installieren:

### iPhone/iPad
1. Öffne die Dashboard-URL in Safari
2. Tippe auf das **Teilen-Symbol** (Quadrat mit Pfeil)
3. Wähle **Zum Home-Bildschirm**
4. Tippe auf **Hinzufügen**

### Android
1. Öffne die Dashboard-URL in Chrome
2. Tippe auf die **drei Punkte** oben rechts
3. Wähle **App installieren** oder **Zum Startbildschirm hinzufügen**

---

## Update durchführen

Wenn eine neue Version verfügbar ist:

```bash
# Zum Ordner mit docker-compose.yml wechseln
cd /pfad/zu/ha-dashboard

# Neues Image herunterladen
docker-compose pull

# Container neu starten
docker-compose down
docker-compose up -d
```

---

## Häufige Probleme

### "Anmeldung fehlgeschlagen"
- Prüfe, ob die Redirect URI in Home Assistant korrekt ist
- HTTPS muss funktionieren (kein HTTP!)

### Dashboard zeigt nichts an
- Gehe in die Einstellungen und wähle deine Entitäten aus
- Ohne Konfiguration bleibt das Dashboard leer

### Karten werden nicht angezeigt
- Seite neu laden (Strg+F5 oder Cmd+Shift+R)

### Status aktualisiert sich nicht
- WebSocket-Verbindung prüfen (Cloudflare Tunnel muss WebSockets unterstützen)

### Mehrere Benutzer
- Jeder Benutzer kann sich separat anmelden
- Jeder hat seine eigenen Einstellungen und Hintergrundbild

---

## Technische Details (für Entwickler)

<details>
<summary>Klicken zum Aufklappen</summary>

### Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- OAuth 2.0 mit PKCE

### Architektur
- Alle Home Assistant API-Aufrufe gehen über den Server (Tokens nie im Browser)
- OAuth Tokens werden AES-256 verschlüsselt gespeichert
- WebSocket für Echtzeit-Updates
- PWA mit Service Worker

### Lokale Entwicklung
```bash
npm install
npx prisma generate
npm run dev
```

### Docker Image selbst bauen
```bash
docker build -t ha-dashboard .
```

</details>

---

## Lizenz

MIT License - Frei verwendbar und anpassbar.
