# HA Dashboard

## Overview

HA Dashboard is a modern, mobile-first Progressive Web App (PWA) for Home Assistant. It provides a sleek interface for controlling smart home devices, monitoring energy usage, security systems, and family presence. The application uses internal username/password authentication with role-based access control (RBAC). A global Home Assistant token connects all users to the same HA instance, and user configurations are stored server-side.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router and TypeScript in strict mode
- **Styling**: Tailwind CSS with Apple Home-inspired glassmorphism design (translucent surfaces, backdrop blur, warm gradients)
- **State Management**: Zustand for both HA connection state and configuration state
- **Animations**: Framer Motion for smooth UI transitions
- **Charts**: Recharts for energy monitoring visualizations
- **Icons**: Lucide React icon library
- **PWA**: `next-pwa` for an installable app experience with service worker

### Backend Architecture
- **API Routes**: Next.js Route Handlers in `/app/api/` directory
- **Database**: SQLite via Prisma ORM for user data, sessions, and dashboard configurations
- **Token Security**: AES-256-GCM encryption for storing Home Assistant Long-Lived Token at rest
- **Session Management**: HTTP-only cookies with 30-day expiration for secure authentication
- **CSRF Protection**: Origin/Referer validation on all state-changing endpoints
- **Gateway Server**: Single-URL gateway on port 8080 bundles Next.js (port 3000) and WS-Proxy (port 6000), forwarding HTTP requests and tunneling WebSocket upgrades.

### Authentication Flow
- Internal username/password authentication with bcrypt password hashing and RBAC.
- Five predefined roles: Owner, Admin, Power User, Viewer, Guest, with 23 granular permissions.
- Global HA token configured by an administrator and stored encrypted.
- No OAuth; authentication is solely via username/password.

### Home Assistant Integration
- **Proxy Pattern**: All HA API calls are proxied through server-side routes (`/api/ha/*`) to prevent token exposure.
- **WebSocket Client**: `lib/ha/websocket-client.ts` handles real-time state updates via a server-side proxy (port 6000) that maintains the HA token.
- **Polling Fallback**: Automatic fallback to polling with exponential backoff if WebSocket connection fails.
- **Mock Mode**: Development fallback with mock data for testing.

### Key Design Decisions
- **Server-side token storage**: HA tokens are encrypted and stored in the database, never exposed client-side.
- **Per-user configuration**: Dashboard layouts and entity mappings are stored per user in `DashboardConfig`.
- **Global Settings**: System-wide configurations (HA entities, UniFi, Calendar) are stored in `SystemConfig`.
- **Responsive layout**: Mobile-first design with bottom navigation; desktop features a collapsible sidebar.
- **Standalone output**: Next.js configured with `output: 'standalone'` for Docker deployment.
- **UniFi Integration**: Full integration with UniFi Protect and Access using API Key authentication, with encrypted API keys and dedicated API routes for device control and event retrieval.
- **Live Camera Streaming**: Native fMP4 streaming using the `unifi-protect` library's Livestream API. Streams are proxied via WS-Proxy (`/ws/livestream/:cameraId`) for secure token handling. Features multi-client support (single stream shared across viewers), automatic reconnection with exponential backoff and session refresh, and configurable quality channels (high/medium/low via `unifi_rtsp_channel` setting). Toggle between snapshot and live view on camera page.
- **AI Surveillance**: A dedicated page (`/surveillance`) for viewing and filtering smart detection events from UniFi Protect.
- **Apple Home Design Overhaul**: Complete visual redesign inspired by Apple Home app, featuring glassmorphism UI, translucent cards, backdrop blur, and customizable warm gradient backgrounds.
- **Dashboard Popup Notifications**: Real-time popups triggered by Home Assistant events, featuring queue management, deduplication, severity levels, and media.
- **Dynamic Pages**: Dedicated pages for Lights, Covers, Cameras, Intercoms, and Climate control.
- **Heat Pump Monitoring**: Dedicated page (`/heatpump`) for Stiebel Eltron heat pump monitoring with collapsible sections for temperatures (Gesamt/OG/EG with Vorlauf/Rücklauf), hot water, compressor, energy (with COP calculation), and SG Ready. All entities configurable via Settings dropdown selection.

## External Dependencies

### Database
- **SQLite**: Local file-based database via Prisma ORM.
- **Prisma Client**: `@prisma/client` for database operations.
- Schema includes: `User`, `Session`, `Role`, `Permission`, `SystemConfig`, `DashboardConfig` tables.

### Home Assistant
- Global Long-Lived Access Token (configured by admin, stored encrypted).
- REST API for entity states and service calls (via server-side proxy).
- WebSocket via server-side proxy on port 6000 (token stays server-side).

### Environment Variables
- `ENCRYPTION_KEY`: AES-256-GCM encryption key.
- `SQLITE_URL`: SQLite database path.
- `APP_BASE_URL`: Public URL for CSRF validation.
- `ALLOWED_HOSTS`: Additional allowed hosts for CSRF.
- `WS_PROXY_PORT`: WebSocket proxy port.

### HTTPS
- HTTPS is handled externally by **Cloudflare Tunnel**.
- The application runs on HTTP internally.

### Build & Deployment
- Docker Compose for containerized deployment.
- Supports Raspberry Pi / ARM architectures.