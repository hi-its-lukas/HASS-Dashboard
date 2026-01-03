# HA Dashboard

A modern, mobile-first Progressive Web App (PWA) interface for Home Assistant, featuring a dark neumorphism/glassmorphism design with OAuth authentication and per-user configuration.

## Features

- **Login with Home Assistant** - OAuth 2.0 with PKCE for secure authentication
- **Multi-User Support** - Each user has their own dashboard configuration
- **Per-User Settings** - Configure entity mappings via Settings UI (not env files)
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

## Setup

**HTTPS is always enabled** with automatic Let's Encrypt certificates via Caddy.

### Interactive Setup

Run the setup script - it asks for domain and email:

```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

Or create `.env` manually:

```env
DOMAIN=dashboard.yourdomain.com
ACME_EMAIL=your@email.com
```

Everything else is auto-configured:
- Encryption keys are generated automatically
- SQLite database is created automatically
- SSL certificates are obtained from Let's Encrypt

### Optional

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | Use your own key instead of auto-generated |

**Important**: User-specific settings (Home Assistant URL, entity mappings) are configured in the Settings UI after login - NOT in environment files.

## Quick Start with Docker

```bash
# Clone repository
git clone https://github.com/hi-its-lukas/hass-dashboard.git
cd hass-dashboard

# Run interactive setup
./setup.sh

# Start
docker compose up -d --build
```

Access the dashboard at `https://yourdomain.com`

## Network Setup for External Access

To access the dashboard from both inside your home network and externally (e.g., mobile), use **Split-Horizon DNS**:

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
git clone https://github.com/yourusername/ha-dashboard.git
cd ha-dashboard
npm install

# Create environment file
cp .env.example .env.local
nano .env.local

# Setup database
npx prisma generate
npx prisma db push

# Build and start
npm run build
npm start
```

### Autostart with systemd

```bash
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

- **Entity Discovery** - Automatically discovers all your HA entities
- **Entity Mapping** - Map entities to dashboard widgets
- **Dashboard Layout** - Configure rooms, persons, and more

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

## Troubleshooting

### OAuth Redirect Issues

- Ensure `APP_BASE_URL` matches exactly how users access the dashboard
- Check that your Home Assistant is accessible from the dashboard server
- Verify Split-DNS is configured correctly

### "Connection Refused" after HA Login

- The callback URL is pointing to localhost or wrong port
- Set `APP_BASE_URL` to your actual dashboard URL

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

## Project Structure

```
ha-dashboard/
├── app/
│   ├── (dashboard)/        # Protected dashboard pages
│   ├── api/                # API routes
│   └── login/              # Login page
├── components/             # React components
├── config/                 # Static configuration
├── lib/                    # Utilities and stores
├── prisma/                 # Database schema
├── docker-compose.yml
├── Dockerfile
└── Caddyfile
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
