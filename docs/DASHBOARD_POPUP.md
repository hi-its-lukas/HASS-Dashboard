# Dashboard Popup Notifications

Das HA Dashboard kann Popup-Benachrichtigungen direkt von Home Assistant Automationen empfangen. Diese erscheinen sofort im Dashboard - ideal für Türklingeln, Alarme oder andere wichtige Events.

## Funktionsweise

1. Home Assistant feuert ein Custom Event `dashboard_popup`
2. Das Dashboard empfängt das Event über WebSocket
3. Ein Popup erscheint mit optionalem Kamera-Bild, AI-Beschreibung und Intercom-Link

## Event-Struktur

```yaml
event: dashboard_popup
event_data:
  title: "Titel"           # Pflicht - Überschrift des Popups
  message: "Nachricht"     # Optional - Beschreibungstext
  severity: "info"         # Optional - info | warning | critical
  timeout: 15000           # Optional - Auto-Close in ms (Standard: 15000)
  tag: "eindeutige_id"     # Optional - Ersetzt statt stapelt bei gleichem Tag
  camera_entity: "camera.haustuer"     # Optional - Zeigt Kamera-Snapshot
  ai_description: "Person mit Paket"   # Optional - AI-generierter Text
  intercom_slug: "haustuer"            # Optional - Link zu /intercom/{slug}
```

## Beispiel-Automationen

### Einfache Türklingel

```yaml
alias: "Türklingel Popup"
trigger:
  - platform: state
    entity_id: binary_sensor.doorbell
    to: "on"
action:
  - event: dashboard_popup
    event_data:
      title: "Türklingel"
      message: "Es hat an der Haustür geklingelt!"
      severity: "info"
      timeout: 30000
      tag: "doorbell"
```

### Türklingel mit Kamera

```yaml
alias: "Türklingel mit Kamera"
trigger:
  - platform: state
    entity_id: binary_sensor.doorbell
    to: "on"
action:
  - event: dashboard_popup
    event_data:
      title: "Türklingel"
      message: "Jemand steht vor der Tür"
      camera_entity: "camera.haustuer"
      intercom_slug: "haustuer"
      timeout: 60000
      tag: "doorbell"
```

### UniFi Protect mit AI-Erkennung

```yaml
alias: "Klingel mit AI Beschreibung"
trigger:
  - platform: state
    entity_id: binary_sensor.g4_doorbell_doorbell
    to: "on"
action:
  - delay:
      seconds: 2  # Warte auf AI-Verarbeitung
  - event: dashboard_popup
    event_data:
      title: "Türklingel"
      message: "Bewegung an der Haustür erkannt"
      camera_entity: "camera.g4_doorbell_high"
      ai_description: "{{ states('sensor.g4_doorbell_detected_object') }}"
      intercom_slug: "haustuer"
      severity: "info"
      timeout: 45000
      tag: "doorbell"
```

### Bewegungsalarm (kritisch)

```yaml
alias: "Bewegungsalarm nachts"
trigger:
  - platform: state
    entity_id: binary_sensor.garten_motion
    to: "on"
condition:
  - condition: time
    after: "22:00:00"
    before: "06:00:00"
action:
  - event: dashboard_popup
    event_data:
      title: "Bewegungsalarm"
      message: "Bewegung im Garten erkannt!"
      camera_entity: "camera.garten"
      severity: "critical"
      timeout: 60000
```

### Waschmaschine fertig

```yaml
alias: "Waschmaschine fertig"
trigger:
  - platform: state
    entity_id: sensor.waschmaschine_status
    to: "Fertig"
action:
  - event: dashboard_popup
    event_data:
      title: "Waschmaschine"
      message: "Die Wäsche ist fertig!"
      severity: "info"
      timeout: 0  # Kein Auto-Close
```

## Severity-Level

| Severity | Farbe | Verwendung |
|----------|-------|------------|
| `info` | Cyan | Standard, allgemeine Hinweise |
| `warning` | Orange/Amber | Warnungen, erhöhte Aufmerksamkeit |
| `critical` | Rot (pulsierend) | Alarme, sofortige Aufmerksamkeit |

## Tipps

### Tag für Deduplizierung

Verwende `tag` um mehrfaches Klingeln zu einem Popup zusammenzufassen:

```yaml
tag: "doorbell"  # Neues Event ersetzt vorheriges mit gleichem Tag
```

### Timeout-Werte

- `0` = Kein Auto-Close, manuelles Schließen erforderlich
- `15000` = Standard (15 Sekunden)
- `60000` = 1 Minute (empfohlen für Türklingel mit Kamera)
- Max: `120000` (2 Minuten)

### Kamera-Entitäten

Stelle sicher, dass die Kamera-Entität existiert und erreichbar ist:
- UniFi Protect: `camera.g4_doorbell_high`, `camera.g4_bullet_high`
- Generic: `camera.haustuer`, `camera.garten`

### Intercom-Slug

Der `intercom_slug` muss mit einem konfigurierten Intercom in den Dashboard-Einstellungen übereinstimmen.

## Testen

1. Öffne Home Assistant → Entwicklerwerkzeuge → Ereignisse
2. Unter "Ereignis auslösen":
   - Ereignistyp: `dashboard_popup`
   - Ereignisdaten:
   ```yaml
   title: "Test"
   message: "Das ist ein Test-Popup!"
   severity: "info"
   timeout: 10000
   ```
3. Klicke "EREIGNIS AUSLÖSEN"
4. Das Popup sollte im Dashboard erscheinen

## Voraussetzungen

- Dashboard muss im Browser geöffnet sein
- WebSocket-Verbindung zu Home Assistant muss aktiv sein
- Für Kamera-Snapshots: Kamera muss in Home Assistant verfügbar sein
