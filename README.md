# HA Dashboard

A modern, mobile-first Progressive Web App (PWA) interface for Home Assistant, featuring a dark neumorphism/glassmorphism design with OAuth authentication and per-user configuration.

## Features

- **Login with Home Assistant** - OAuth 2.0 with PKCE for secure authentication
- **Multi-User Support** - Each user has their own dashboard configuration
- **Per-User Settings** - Configure entity mappings via Settings UI
- **Secure Token Storage** - OAuth tokens encrypted at rest (AES-256-GCM)
- **Real-time Updates** - WebSocket-based state synchronization

### Dashboard Pages

- **Home** - Time, weather, lights count, power usage, alarm status, presence tracking
- **Energy** - Solar, battery, grid, and house consumption monitoring with trend charts
- **Security** - Alarm control with Stay/Away/Night/Disarm modes, zone status
- **Family** - Presence detection with activity data (steps, distance, floors)
- **Surveillance** - Event feed with person/vehicle detection
- **PWA Support** - Install as native app on iOS/Android

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: SQLite via Prisma ORM
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: next-pwa
- **Reverse Proxy**: Caddy (optional, for HTTPS)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (recommended)
- Home Assistant instance accessible via HTTPS

### 1. Clone and Setup

```bash
git clone https://github.com/hi-its-lukas/HASS-Dashboard
cd HASS-Dashboard
cp .env.example .env.local
```

### 2. Configure Environment

Edit `.env.local`:

```env
# REQUIRED: Public URL where the dashboard is accessible
NEXT_PUBLIC_APP_URL=https://dashboard.yourdomain.com

# REQUIRED: 32-byte hex key for encrypting OAuth tokens
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-32-byte-hex-key

# REQUIRED: Secret for signing session cookies
# Generate with: openssl rand -hex 32
SESSION_SECRET=your-32-byte-hex-key

# Database path
DATABASE_URL=file:./data/ha-dashboard.db

# For HTTPS with Caddy (optional)
DOMAIN=dashboard.yourdomain.com
ACME_EMAIL=your@email.com

# Development: Use mock data instead of real HA
NEXT_PUBLIC_USE_MOCK=false
```

### 3. Start with Docker

**Development (HTTP only):**
```bash
docker compose up -d --build
```

**Production with HTTPS:**
```bash
docker compose --profile https up -d --build
```

### 4. Access the Dashboard

- Open `https://dashboard.yourdomain.com` (or `http://localhost:5000` for development)
- Click "Login with Home Assistant"
- Enter your Home Assistant URL and authorize

## Network Setup for External Access

To access the dashboard from both inside your home network and externally (e.g., from mobile), use **Split-Horizon DNS**:

### Why Split DNS?

OAuth requires the same callback URL everywhere. If you use `192.168.x.x` at home but `dashboard.yourdomain.com` remotely, login will fail.

### Setup

1. **Public DNS**: Point `dashboard.yourdomain.com` to your external IP (or use DynDNS)

2. **Router/Local DNS**: Add a local override:
   - `dashboard.yourdomain.com` -> `192.168.x.x` (your server's local IP)
   - This can be done in your router settings, Pi-hole, or AdGuard Home

3. **Port Forwarding**: Forward ports 80 and 443 to your Caddy container

4. **Firewall**: Ensure ports are open on your server

Now both internal and external clients will use the same URL, and OAuth will work everywhere.

## Manual Installation (without Docker)

### Linux / Ubuntu / Raspberry Pi

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Clone and install
git clone <repo-url>
cd ha-dashboard
npm install

# Setup database
npx prisma generate
npx prisma db push

# Build and start
npm run build
npm start
```

### Autostart with systemd

```bash
# Create service file
sudo nano /etc/systemd/system/ha-dashboard.service
```

```ini
[Unit]
Description=HA Dashboard
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/ha-dashboard
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ha-dashboard
sudo systemctl start ha-dashboard
```

## Configuration

### Settings UI

After logging in, go to **Settings** to configure:

- **Home Assistant URL** - Your HA instance URL
- **Entity Discovery** - Automatically discovers all your HA entities
- **Entity Mapping** - Map entities to dashboard widgets

### Static Configuration (fallback)

For unauthenticated users or development, edit `config/dashboard.ts`.

## Security

### Authentication Flow

1. User clicks "Login with Home Assistant"
2. Dashboard redirects to Home Assistant OAuth authorize endpoint
3. User approves access in Home Assistant
4. HA redirects back with authorization code
5. Dashboard exchanges code for tokens (server-side)
6. Tokens are encrypted with AES-256-GCM and stored in SQLite
7. Session cookie is set (httpOnly, secure, sameSite)

### Security Features

- **No tokens in browser** - All HA API calls go through server-side proxy
- **Encrypted at rest** - OAuth tokens encrypted with ENCRYPTION_KEY
- **httpOnly cookies** - Session cookies not accessible via JavaScript
- **OAuth with PKCE** - Proof Key for Code Exchange prevents interception
- **Separate nonces** - Each encrypted token uses a unique nonce
- **30-day sessions** - Sessions expire after 30 days of inactivity

### Recommendations

1. Always use HTTPS in production (Caddy handles this automatically)
2. Use a strong, random ENCRYPTION_KEY
3. Keep your Home Assistant instance updated
4. Use the Split-DNS setup for external access

## Project Structure

```
ha-dashboard/
├── app/
│   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── page.tsx        # Home
│   │   ├── energy/         # Energy dashboard
│   │   ├── family/         # Family tracker
│   │   ├── secure/         # Security panel
│   │   ├── surveillance/   # AI Surveillance
│   │   ├── calendar/       # Calendar
│   │   ├── more/           # More options
│   │   └── settings/       # User settings
│   ├── api/
│   │   ├── auth/           # OAuth endpoints
│   │   ├── ha/             # HA proxy endpoints
│   │   ├── me/             # Current user
│   │   ├── settings/       # User config
│   │   └── status/         # Connection status
│   ├── login/              # Login page
│   └── layout.tsx          # Root layout
├── components/
│   ├── cards/              # Dashboard cards
│   ├── nav/                # Navigation (sidebar, bottom-nav)
│   ├── providers/          # Context providers
│   └── ui/                 # Reusable UI components
├── config/
│   └── dashboard.ts        # Static entity configuration
├── lib/
│   ├── auth/               # Authentication utilities
│   ├── config/             # Config store
│   ├── db/                 # Prisma client
│   └── ha/                 # Home Assistant client
├── prisma/
│   └── schema.prisma       # Database schema
├── docker-compose.yml      # Docker configuration
├── Dockerfile              # Docker build
└── Caddyfile               # Caddy reverse proxy config
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Initiate OAuth login |
| `/api/auth/callback` | GET | OAuth callback handler |
| `/api/auth/logout` | POST | Logout and clear session |
| `/api/me` | GET | Get current user info |
| `/api/settings` | GET/POST | User dashboard config |
| `/api/status` | GET | HA connection status |
| `/api/ha/states` | GET | Proxy to HA states |
| `/api/ha/call-service` | POST | Proxy to HA services |
| `/api/ha/registries` | GET | Get HA areas/entities |

## Troubleshooting

### OAuth Redirect Issues

- Ensure `NEXT_PUBLIC_APP_URL` matches exactly how users access the dashboard
- Check that your Home Assistant is accessible from the dashboard server
- Verify Split-DNS is configured correctly

### "Connection Refused" after HA Login

- The callback URL is pointing to localhost or wrong port
- Set `NEXT_PUBLIC_APP_URL` to your actual dashboard URL

### Database Reset

```bash
rm -rf data/
npx prisma db push
```

Or with Docker:
```bash
docker compose down
rm -rf data/
docker compose up -d --build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Design inspired by Nico Papanicolaou's Home Assistant mobile interface
- Icons from [Lucide](https://lucide.dev)
