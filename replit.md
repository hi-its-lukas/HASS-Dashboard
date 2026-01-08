# HA Dashboard

## Overview

HA Dashboard is a modern, mobile-first Progressive Web App (PWA) for Home Assistant. It provides a sleek interface with dark neumorphism/glassmorphism design for controlling smart home devices, monitoring energy usage, security systems, and family presence. The application uses internal username/password authentication with role-based access control (RBAC). A global Home Assistant token connects all users to the same HA instance. User configurations are stored server-side per user.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (2026-01-08)
- **Single-URL Gateway Architecture** - Nur noch eine externe URL nötig
  - Gateway-Server (`server/gateway.ts`) auf Port 80 bündelt alle Services
  - Spawnt Next.js intern auf Port 3000 und WS-Proxy auf Port 6000
  - HTTP-Requests werden an Next.js weitergeleitet
  - WebSocket-Upgrades auf `/ws/ha` werden an WS-Proxy getunnelt
  - Keine separate Subdomain für WebSocket mehr nötig
  - Cloudflare Tunnel nur noch zu Port 80
  - X-Forwarded-* Headers für korrekte Cookie-Domain
  - Child-Process Supervision (Gateway beendet sich wenn ein Service stirbt)

## Recent Changes (2026-01-07)
- **OAuth KOMPLETT ENTFERNT** - Nur noch internes User-Management
  - Alle OAuth-Routen, Callbacks und Token-Storage entfernt
  - OAuthToken Model aus Prisma-Schema entfernt
  - Keine OAuth-Callbacks oder Redirects mehr
  - Authentifizierung nur über Benutzername/Passwort
- **Global Long-Lived Access Token** - Admin-konfigurierter HA-Token für alle Benutzer
  - Admin konfiguriert URL + Long-Lived Access Token in `/settings/homeassistant`
  - Token verschlüsselt mit AES-256-GCM in SystemConfig Tabelle
  - Alle HA API-Routen nutzen `getGlobalHAConfig()` aus `lib/ha/token.ts`
  - Neue API-Route `/api/ha/config` für GET/POST HA-Konfiguration
  - `testHAConnection()` validiert Token vor Speicherung
  - Settings UI zeigt "(gespeichert)" Indikator wenn Token existiert
- **WebSocket-Proxy Server** - Token bleibt serverseitig
  - Separater WS-Proxy auf Port 6000 (`npm run ws-proxy`)
  - Client verbindet zum Proxy ohne Token
  - Proxy verbindet zu HA mit Token und leitet bidirektional weiter
  - Session-Authentifizierung für alle WS-Verbindungen
  - Unauthentifizierte Verbindungen werden abgelehnt
- **Polling-Fallback mit Auto-Mode**
  - WebSocket-Proxy ist primär, Polling nur wenn WS ausfällt
  - Automatische Wiederverbindung mit Backoff (5s, 10s, 20s, 60s)
  - Server-seitiger State-Cache für Polling (2s TTL)
  - `/api/ha/poll` Endpoint für Polling
- **Neue Helper und Scripts**
  - `lib/ha/fetch.ts` - Zentraler haFetch() Helper für alle HA-Anfragen
  - `scripts/create-admin.ts` - Admin-Benutzer über CLI erstellen (`npm run create-admin`)
  - Alle HA-Routen nutzen jetzt den haFetch() Helper
- **Security Hardening (Major Audit Fixes)**
  - Session lifetime reduced from 365 to 30 days
  - Token-Substring User-IDs replaced with SHA-256 hashed stable IDs verified against HA API
  - Base URL hardened: Production uses `APP_BASE_URL` only, optional `ALLOWED_HOSTS` allowlist
  - UniFi Controller URL validation: HTTPS required in prod, no credentials in URL, SSRF protection
  - All UniFi API requests now have 30-second timeout and max response size (10MB)
  - Settings API validates input with Zod schema, 100KB request size limit
  - API keys never exposed to client (only boolean `_hasProtectKey`/`_hasAccessKey` flags)
  - **Login Timing Attack Prevention**: Constant-time password comparison with dummy hash
  - **WS-Proxy DoS Prevention**: Singleton PrismaClient, sync encryption key loading at startup
  - **WS-Proxy Origin Check**: Production enforces Origin header validation
  - **Encryption Key Safety**: Production requires explicit key (env var or file), no auto-generation
  - **WebSocket Reconnect Jitter**: Exponential backoff with random jitter prevents connection storms
- **Internal Authentication System** - Username/password login with RBAC
  - Database schema: User (username, passwordHash, roleId, status), Role, Permission, RolePermission
  - 5 predefined roles: Owner, Admin, Power User, Viewer, Guest
  - 23 permissions across settings, modules, and actions
  - Login page shows HA connection status indicator
  - **Production: No default admin** - Use `npm run create-admin` to create initial admin
  - **Dev only**: Default admin (admin/admin) when `NODE_ENV !== production`
  - User management page at `/settings/users`
  - CSRF protection on all state-changing endpoints
  - Prisma uses `SQLITE_URL` instead of `DATABASE_URL`
- **UniFi Integration** - Full UniFi Protect and Access integration with API Key authentication
  - Config store extended with `UnifiConfig` type (controllerUrl, protectApiKey, accessApiKey, cameras, accessDevices, aiSurveillanceEnabled)
  - API Keys are encrypted with AES-256-GCM before storage (lib/unifi/encryption.ts)
  - UniFi Settings page at `/settings/unifi` for controller and API key configuration
  - Separate API key inputs for Protect and Access with connection test buttons
  - Keys are masked in UI, shows "(gespeichert)" indicator when a key exists
  - API routes:
    - `/api/unifi/protect/test` - Test Protect connection with new key
    - `/api/unifi/protect/test-saved` - Test Protect connection with saved key
    - `/api/unifi/protect/events` - Get smart detection events
    - `/api/unifi/protect/thumbnail/[eventId]` - Get event thumbnail
    - `/api/unifi/access/test` - Test Access connection with new key
    - `/api/unifi/access/test-saved` - Test Access connection with saved key
    - `/api/unifi/access/doors` - List Access doors
    - `/api/unifi/access/unlock/[doorId]` - Unlock door (requires action:locks permission)
    - `/api/unifi/discover` - Discover cameras and doors with new keys
    - `/api/unifi/discover-saved` - Discover cameras and doors with saved keys
  - UniFi client libraries:
    - `lib/unifi/protect-client.ts` - ProtectClient for cameras, events, thumbnails, snapshots
    - `lib/unifi/access-client.ts` - AccessClient for doors, devices, unlock actions
- **AI Surveillance page** (`/surveillance`) - View smart detection events from UniFi Protect
  - Displays person, vehicle, package, animal, and motion detections
  - Event filtering by type
  - Thumbnail previews with detail modal
  - Auto-refresh every 30 seconds
- **Updated sidebar navigation**
  - AI Surveillance link shown when enabled (amber Sparkles icon)
  - UniFi Access intercoms displayed with purple phone icon for visual distinction
  - HA intercoms shown with default phone icon

## Recent Changes (2026-01-04)
- **New Climate page** (`/climate`) - Control heating, AC, and fans with temperature adjustment and mode selection
- **Apple Home Design Overhaul** - Complete visual redesign inspired by Apple Home app
  - New glassmorphism UI with translucent cards and backdrop blur effects
  - Warm gradient background (customizable via user-uploaded images)
  - Updated color palette with Apple-style accent colors (orange, green, cyan)
  - German translations for UI elements
  - Glass-effect navigation sidebar and bottom nav
  - Status pills for lights/covers count on dashboard
  - Room-based grouping with chevron headers
- **Intercoms in sidebar navigation** - Configured intercoms now appear in sidebar with phone icon
- **Live camera streams for intercoms** - MJPEG streaming via `/api/ha/stream/[entityId]`
- **Improved intercom layout** - Buttons positioned next to video, original aspect ratio preserved
- **Calendar events readable** - Event text no longer truncated, uses word-wrap
- **Fixed map marker icons** - Leaflet icons now load correctly from CDN
- **Dashboard Popup Notifications** - Real-time popups triggered by Home Assistant events
  - WebSocket client extended with generic event subscriptions (`subscribeToEvents`, `onEvent`)
  - Notifications store with queue management, tag-based deduplication, severity levels
  - Popup modal with camera snapshots, AI descriptions, and intercom links
  - Auto-close with progress bar, manual dismiss
  - Documentation at `docs/DASHBOARD_POPUP.md`
- **Weather forecast in calendar** - Fetches forecasts via new `/api/ha/weather` route
  - Weather entity selector added to Settings under Calendar section

## Recent Changes (2026-01-03)
- **New Lights page** (`/lights`) - Grid view of all configured lights with toggle controls and "All off" button
- **New Covers page** (`/covers`) - Grid view of all blinds/covers with open/stop/close controls and "All open/close" buttons
- **New Cameras page** (`/cameras`) - Grid of all camera entities with live feeds, click for fullscreen modal
- **New Intercom pages** (`/intercom/[slug]`) - Dynamic pages for configured intercoms with camera feed, speak button, and door unlock
- **Intercom configuration in Settings** - Add/remove intercoms with camera entity, speak URL, and lock entity
- Updated sidebar navigation with Lights, Covers, Cameras links
- Updated More page with quick access grid for all pages and intercoms section
- Per-user background image upload with secure file storage in /data/backgrounds
- Background images served via API with authentication (users can only access their own)
- Settings page includes background upload/preview/delete UI
- Dashboard displays custom background with dark overlay for readability
- Calendar page now uses CalendarWeek component with real HA calendar entities
- More page buttons now configurable via Settings (select HA scripts as buttons)
- Family page PersonCard auto-discovers activity sensors (steps, distance, battery)
- New API routes: /api/ha/camera/[entityId], /api/ha/frigate/events, /api/ha/frigate/thumbnail/[eventId]
- Dashboard now displays user-configured entities instead of hardcoded examples
- Fixed: Background URL persistence when saving settings
- Fixed: Config store now correctly merges updates with existing values
- Config store converts simple entity ID arrays into structured objects
- PersonCard/ApplianceCard show Home Assistant friendly_name when available
- Rooms are auto-grouped by light entity prefix (e.g., `light.kitchen_main` → "Kitchen")
- Appliance icons are auto-detected based on entity name (washer, dryer, etc.)
- Empty configurations show helpful messages with links to Settings page
- Fixed Prisma version conflict in Docker (uses local v5.22.0 instead of npx v7.x)
- Fixed docker-entrypoint.sh for database schema initialization

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router and TypeScript in strict mode
- **Styling**: Tailwind CSS with Apple Home-inspired glassmorphism design (translucent surfaces, backdrop blur, warm gradients)
- **State Management**: Zustand for both HA connection state (`lib/ha/store.ts`) and configuration state (`lib/config/store.ts`)
- **Animations**: Framer Motion for smooth UI transitions
- **Charts**: Recharts for energy monitoring visualizations
- **Icons**: Lucide React icon library
- **PWA**: next-pwa for installable app experience with service worker

### Backend Architecture
- **API Routes**: Next.js Route Handlers in `/app/api/` directory
- **Database**: SQLite via Prisma ORM for user data, sessions, and dashboard configurations
- **Token Security**: AES-256-GCM encryption for storing Home Assistant Long-Lived Token at rest
- **Session Management**: HTTP-only cookies with 30-day expiration for secure authentication
- **CSRF Protection**: Origin/Referer validation on all state-changing endpoints

### Authentication Flow
- Internal username/password authentication with bcrypt password hashing
- Flow: `/login` → POST `/api/auth/login` → session created
- Global HA token configured by admin in `/settings/homeassistant`
- Token never exposed to client - all HA calls go through server-side proxy

### Home Assistant Integration
- **Proxy Pattern**: All HA API calls go through server-side routes (`/api/ha/*`) - tokens never exposed to browser
- **WebSocket Client**: `lib/ha/websocket-client.ts` handles real-time state updates
- **Mock Mode**: Development fallback with mock data when `NEXT_PUBLIC_USE_MOCK=true`
- **Entity Discovery**: `/api/ha/registries` fetches areas, devices, and entities for settings UI

### Key Design Decisions
1. **Server-side token storage**: OAuth tokens encrypted and stored in database, never in client-side code or NEXT_PUBLIC variables
2. **Per-user configuration**: Dashboard layouts and entity mappings stored per-user in `DashboardConfig` table
3. **Responsive layout**: Mobile-first with bottom navigation; desktop shows collapsible sidebar
4. **Standalone output**: Next.js configured with `output: 'standalone'` for Docker deployment

## External Dependencies

### Database
- **SQLite**: Local file-based database via Prisma ORM
- **Prisma Client**: `@prisma/client` for database operations
- Schema includes: `User`, `Session`, `Role`, `Permission`, `SystemConfig`, `DashboardConfig` tables

### Home Assistant
- Global Long-Lived Access Token (configured by admin, stored encrypted)
- REST API for entity states and service calls (via server-side proxy)
- WebSocket via server-side proxy on port 6000 (token stays server-side)

### Environment Variables
- `ENCRYPTION_KEY`: Auto-generated if not set (stored in `/data/.encryption_key`)
- `SQLITE_URL`: SQLite database path (default: `file:/data/ha-dashboard.db`)
- `APP_BASE_URL`: Public URL for CSRF validation (production)
- `ALLOWED_HOSTS`: Additional allowed hosts for CSRF (comma-separated)
- `WS_PROXY_PORT`: WebSocket proxy port (default: 6000)

### HTTPS
- HTTPS is handled externally by **Cloudflare Tunnel**
- No Let's Encrypt / ACME - TLS terminates at Cloudflare
- App runs on HTTP internally (port 3000)

### Build & Deployment
- Docker Compose for containerized deployment
- Runs on port 5000 by default
- Supports Raspberry Pi / ARM architectures