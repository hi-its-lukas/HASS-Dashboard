# HA Dashboard

A modern, mobile-first Progressive Web App (PWA) interface for Home Assistant, featuring a dark neumorphism/glassmorphism design with WebSocket-based real-time updates.

![Dashboard Preview](docs/preview.png)

## Features

- 🏠 **Home Screen** - Time, weather, lights count, power usage, alarm status, presence tracking
- ⚡ **Energy Dashboard** - Solar, battery, grid, and house consumption monitoring with trend charts
- 🔒 **Security Panel** - Alarm control with Stay/Away/Night/Disarm modes, zone status, dog mode
- 👨‍👩‍👧‍👦 **Family Tracker** - Presence detection with activity data (steps, distance, floors)
- 🎥 **AI Surveillance** - Event feed with person/vehicle detection and confidence scores
- 📱 **PWA Support** - Install as native app on iOS/Android

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: next-pwa

## Setup

### Linux / Ubuntu / Raspberry Pi (Empfohlen)

```bash
# 1. Node.js 20 installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 2. Projekt entpacken
unzip ha-dashboard.zip
cd ha-dashboard

# 3. Setup-Script ausführen
chmod +x setup.sh
./setup.sh

# 4. Konfiguration anpassen
nano .env.local

# 5. Starten
npm start
```

Das Dashboard ist dann erreichbar unter `http://<IP-Adresse>:3000`

#### Autostart mit systemd

```bash
# Service-Datei anpassen (User & WorkingDirectory prüfen)
nano ha-dashboard.service

# Service installieren
sudo cp ha-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ha-dashboard
sudo systemctl start ha-dashboard

# Status prüfen
sudo systemctl status ha-dashboard
```

#### Autostart mit PM2 (Alternative)

```bash
sudo npm install -g pm2
pm2 start npm --name "ha-dashboard" -- start
pm2 startup
pm2 save
```

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Home Assistant instance with WebSocket API enabled
- Long-Lived Access Token from Home Assistant

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd ha-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   # Home Assistant WebSocket URL
   NEXT_PUBLIC_HA_WS_URL=wss://your-home-assistant.local/api/websocket

   # Long-Lived Access Token (keep this secret!)
   HA_TOKEN=your-long-lived-access-token

   # Set to 'false' when connecting to real HA
   NEXT_PUBLIC_USE_MOCK=false
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Visit `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Docker Deployment

### Quick Start with Docker Compose

1. **Create `.env` file** (or set environment variables):
   ```env
   NEXT_PUBLIC_HA_WS_URL=wss://your-home-assistant.local/api/websocket
   HA_TOKEN=your-long-lived-access-token
   NEXT_PUBLIC_USE_MOCK=false
   ```

2. **Build and run**:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the dashboard** at `http://localhost:3000`

### Manual Docker Build

```bash
# Build the image
docker build -t ha-dashboard .

# Run the container
docker run -d \
  --name ha-dashboard \
  -p 3000:3000 \
  -e NEXT_PUBLIC_HA_WS_URL=wss://your-ha/api/websocket \
  -e HA_TOKEN=your-token \
  -e NEXT_PUBLIC_USE_MOCK=false \
  --restart unless-stopped \
  ha-dashboard
```

### Home Assistant Add-on (Optional)

If you want to run this as a Home Assistant add-on, you can create a local add-on:

1. Copy the project to `/addons/ha-dashboard/` on your HA server
2. Add a `config.yaml` for the add-on configuration
3. Install via Supervisor → Add-on Store → Local Add-ons

### Docker Network Configuration

If Home Assistant is also running in Docker, you may need to connect both containers to the same network:

```yaml
# docker-compose.yml
services:
  ha-dashboard:
    # ... other config ...
    networks:
      - homeassistant

networks:
  homeassistant:
    external: true
```

## Configuration

### Entity Mapping

Edit `config/dashboard.ts` to map your Home Assistant entities:

```typescript
export const dashboardConfig: DashboardConfig = {
  // Weather entity for header
  weatherEntityId: 'weather.home',
  
  // Group containing all lights
  lightsGroupEntityId: 'group.all_lights',
  
  // Power consumption sensor
  powerEntityId: 'sensor.power_consumption',
  
  // Energy sensors
  energy: {
    solarEntityId: 'sensor.solar_power',
    batteryEntityId: 'sensor.battery_power',
    batteryLevelEntityId: 'sensor.battery_level',
    gridEntityId: 'sensor.grid_power',
    houseEntityId: 'sensor.house_power',
  },
  
  // Room definitions
  rooms: [
    {
      id: 'kitchen',
      name: 'Kitchen',
      floor: 'ground',
      icon: 'utensils',
      entityIds: ['light.kitchen_main', 'light.kitchen_counter'],
    },
    // ... add more rooms
  ],
  
  // Family members
  persons: [
    {
      id: 'user1',
      name: 'John',
      entityId: 'person.john',
      batteryEntityId: 'sensor.john_phone_battery',
      stepsEntityId: 'sensor.john_steps',
      // ...
    },
  ],
}
```

### Available Icons for Rooms

- `utensils` - Kitchen
- `sofa` - Living Room
- `door-open` - Entry
- `layout` - Hallway
- `warehouse` - Garage
- `home` - Bedroom
- `star` - Kids Room
- `heart` - Nursery

## Security

### Token Protection

The Home Assistant token is **never** exposed to the client browser. It's stored server-side and accessed via a Next.js API route:

```
Client → /api/ha/token → Server (reads HA_TOKEN) → Client
```

The WebSocket connection is established client-side, but authentication happens through the server proxy.

### Recommendations

1. Use HTTPS for your Home Assistant instance
2. Create a dedicated HA user with limited permissions
3. Rotate your Long-Lived Access Token periodically
4. Consider adding additional authentication in `/api/ha/token/route.ts`

## Project Structure

```
ha-dashboard/
├── app/
│   ├── api/ha/token/     # Server-side token proxy
│   ├── cams/             # AI Surveillance page
│   ├── calendar/         # Calendar page
│   ├── energy/           # Energy dashboard
│   ├── family/           # Family tracker
│   ├── more/             # More/Alexa page
│   ├── secure/           # Security panel
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── cards/            # Card components
│   ├── nav/              # Navigation components
│   ├── providers/        # Context providers
│   └── ui/               # Reusable UI components
├── config/
│   └── dashboard.ts      # Entity configuration
├── lib/
│   ├── ha/               # Home Assistant client
│   │   ├── index.ts
│   │   ├── mock-data.ts
│   │   ├── store.ts
│   │   ├── types.ts
│   │   └── websocket-client.ts
│   └── utils.ts          # Utility functions
└── public/
    └── manifest.json     # PWA manifest
```

## Mock Mode

The app includes a mock data layer for development without a real Home Assistant instance:

```env
NEXT_PUBLIC_USE_MOCK=true
```

Mock data includes:
- 12 lights across 9 rooms
- Energy sensors with realistic values
- 4 family members with activity data
- 5 surveillance events

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
