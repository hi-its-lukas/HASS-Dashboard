# HA Dashboard Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Access to your Home Assistant instance (must be HTTPS for OAuth)

## Environment Variables

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_BASE_URL` | Public URL of the dashboard | `https://dashboard.yourdomain.com` |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption | `openssl rand -hex 32` |
| `DATABASE_URL` | SQLite database path | `file:/data/ha-dashboard.db` |

### Optional (HTTPS with Caddy)

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Domain for Caddy | `dashboard.yourdomain.com` |
| `ACME_EMAIL` | Email for Let's Encrypt | `your@email.com` |

### Development Only

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_USE_MOCK` | Use mock data instead of real HA |

## Quick Start

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Generate Encryption Key

```bash
openssl rand -hex 32
```

Copy the output to `ENCRYPTION_KEY` in `.env`.

### 3. Configure `.env`

```env
APP_BASE_URL=https://dashboard.yourdomain.com
ENCRYPTION_KEY=<your-generated-key>
DATABASE_URL=file:/data/ha-dashboard.db
DOMAIN=dashboard.yourdomain.com
ACME_EMAIL=your@email.com
```

### 4. Start the Application

**Without HTTPS (development/testing):**
```bash
docker compose up -d --build
```

**With HTTPS (production):**
```bash
docker compose --profile https up -d --build
```

## Architecture

### Security Features

- **No tokens in browser**: HA tokens are stored server-side only
- **Encrypted at rest**: Tokens encrypted with AES-256-GCM
- **httpOnly cookies**: Session cookies are not accessible via JavaScript
- **OAuth with PKCE**: Secure authorization code flow

### Database

SQLite database stored in `./data/ha-dashboard.db`:
- `users`: User accounts linked to HA users
- `oauth_tokens`: Encrypted access/refresh tokens
- `dashboard_configs`: Per-user dashboard settings
- `sessions`: Active user sessions

### User Configuration

User-specific settings are stored in the database and managed via the Settings UI:
- Home Assistant URL (per user)
- Entity mappings
- Dashboard layout
- Sidebar state

These are **NOT** configured via environment variables.

### API Endpoints

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

## HTTPS with Caddy

The included Caddy configuration automatically obtains Let's Encrypt certificates.

1. Set `DOMAIN` and `ACME_EMAIL` in `.env`
2. Ensure ports 80 and 443 are accessible from the internet
3. Run with the `https` profile:

```bash
docker compose --profile https up -d
```

## Updating

### On Raspberry Pi / Ubuntu

```bash
cd /path/to/ha-dashboard
git pull
docker compose down
docker compose up -d --build
```

## Troubleshooting

### OAuth Redirect Issues

- Ensure `APP_BASE_URL` matches the URL users access
- HA must be accessible via HTTPS
- Check that ports 80/443 are forwarded if using Caddy

### Token Expired

- Users will be redirected to login when tokens expire
- Refresh tokens (if available) are used automatically

### Database Reset

To reset the database:
```bash
docker compose down
rm -rf data/
docker compose up -d --build
```

### View Logs

```bash
docker compose logs -f ha-dashboard
```
