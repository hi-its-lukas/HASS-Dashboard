# HA Dashboard Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Access to your Home Assistant instance
- Home Assistant must be accessible via HTTPS (for OAuth)

## Quick Start

### 1. Generate Encryption Key

Generate a 32-byte encryption key for token storage:

```bash
openssl rand -hex 32
```

### 2. Create Environment File

Create a `.env` file in the project root:

```env
# Required: 32-byte hex encryption key for token storage
ENCRYPTION_KEY=<your-generated-key>

# App URL (used for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For HTTPS (optional, requires caddy profile)
DOMAIN=your-domain.com
ACME_EMAIL=your-email@example.com
```

### 3. Start the Application

**Without HTTPS (development):**
```bash
docker compose up -d --build
```

**With HTTPS (production):**
```bash
docker compose --profile https up -d --build
```

### 4. Configure Home Assistant OAuth

In your Home Assistant configuration, add this application as an OAuth client:

1. Go to Home Assistant → Settings → Devices & Services → Integrations
2. The dashboard will redirect users to your HA instance for login
3. Users authorize access, and tokens are stored securely server-side

## Updating on Raspberry Pi

```bash
cd /opt/HASS-Dashboard
git pull
docker compose down
docker compose up -d --build
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for encrypting OAuth tokens |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the dashboard (for OAuth redirect) |
| `SQLITE_URL` | No | SQLite database path (default: file:/data/ha-dashboard.db) |
| `DOMAIN` | No | Domain for HTTPS (Caddy) |
| `ACME_EMAIL` | No | Email for Let's Encrypt certificates |

## Architecture

### Security Features

- **No tokens in browser**: HA tokens are stored server-side only
- **Encrypted at rest**: Tokens encrypted with AES-256-GCM
- **httpOnly cookies**: Session cookies are not accessible via JavaScript
- **OAuth with PKCE**: Secure authorization code flow

### Database

SQLite database stored in `/data/ha-dashboard.db`:
- `users`: User accounts linked to HA users
- `oauth_tokens`: Encrypted access/refresh tokens
- `dashboard_configs`: Per-user dashboard settings
- `sessions`: Active user sessions

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

## Troubleshooting

### OAuth Redirect Issues

- Ensure `NEXT_PUBLIC_APP_URL` matches the URL users access
- HA must be accessible via the same URL used during login

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
