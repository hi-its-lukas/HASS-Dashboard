# HA Dashboard

## Overview

HA Dashboard is a modern, mobile-first Progressive Web App (PWA) for Home Assistant. It provides a sleek interface with dark neumorphism/glassmorphism design for controlling smart home devices, monitoring energy usage, security systems, family presence, and AI surveillance feeds. The application uses OAuth authentication with Home Assistant instances and stores user configurations server-side.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (2026-01-03)
- Refactored all dashboard pages to use dynamic per-user configuration via `useConfig()` hook
- Created `lib/config/store.ts` - Zustand store that loads user config from API and falls back to static defaults
- Added `ConfigProvider` component to initialize config on app mount
- Updated sidebar to persist collapsed state via config store for authenticated users
- Fixed token encryption security - each token (access/refresh) now uses unique nonces
- All pages verified working: Home, Energy, Family, Security, Settings

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router and TypeScript in strict mode
- **Styling**: Tailwind CSS with custom design tokens for dark theme (neumorphism/glassmorphism aesthetic)
- **State Management**: Zustand for both HA connection state (`lib/ha/store.ts`) and configuration state (`lib/config/store.ts`)
- **Animations**: Framer Motion for smooth UI transitions
- **Charts**: Recharts for energy monitoring visualizations
- **Icons**: Lucide React icon library
- **PWA**: next-pwa for installable app experience with service worker

### Backend Architecture
- **API Routes**: Next.js Route Handlers in `/app/api/` directory
- **Database**: SQLite via Prisma ORM for user data, sessions, OAuth tokens, and dashboard configurations
- **Token Security**: AES-256-GCM encryption for storing Home Assistant OAuth tokens at rest (uses `ENCRYPTION_KEY` environment variable)
- **Session Management**: HTTP-only cookies with 30-day expiration for secure authentication

### Authentication Flow
- OAuth 2.0 with PKCE (Proof Key for Code Exchange) for Home Assistant login
- Flow: `/login` → `/api/auth/login` → HA authorize → `/api/auth/callback` → session created
- Sessions stored in database with secure token, linked to encrypted OAuth credentials

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
- Schema includes: `User`, `Session`, `OAuthToken`, `DashboardConfig` tables

### Home Assistant
- OAuth 2.0 authentication with the HA instance
- REST API for entity states and service calls
- WebSocket API for real-time state subscriptions

### Environment Variables Required
- `ENCRYPTION_KEY`: 32-byte hex key for token encryption (server-only)
- `NEXT_PUBLIC_APP_URL`: Application URL for OAuth redirects
- `DATABASE_URL`: Prisma database connection (defaults to SQLite file)

### Optional Services
- **Caddy**: Reverse proxy for HTTPS with automatic Let's Encrypt certificates (via Docker Compose `--profile https`)

### Build & Deployment
- Docker Compose for containerized deployment
- Runs on port 5000 by default
- Supports Raspberry Pi / ARM architectures