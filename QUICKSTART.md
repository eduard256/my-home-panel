# Home Panel - Quick Start Guide

Complete home infrastructure management system with premium UI.

## Features

- 🖥️ **Proxmox Monitoring**: Server metrics, VM/CT management
- 🏠 **Smart Home**: Zigbee2MQTT device control
- 📹 **Camera Integration**: Frigate NVR with event detection
- 🤖 **AI Assistant**: Claude-powered infrastructure management
- ⚡ **Automations**: Docker container management with MQTT triggers

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  External   │
│  (React)    │     │  (FastAPI)  │     │  Services   │
│  Port 3000  │     │  Port 8000  │     │  (Proxmox,  │
└─────────────┘     └─────────────┘     │  Frigate)   │
                                        └─────────────┘
```

## Quick Start

### 1. Configure Environment

Copy example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# API Security
JWT_SECRET_KEY=your-long-random-secret-key-here
ACCESS_TOKEN=your-access-token

# Proxmox
PROXMOX_HOST=10.0.10.10
PROXMOX_PORT=8006
PROXMOX_USER=root@pam
PROXMOX_PASSWORD=your-password
PROXMOX_VERIFY_SSL=false

# AI Hub (Claude)
AI_HUB_BASE_URL=http://10.0.20.90:8080
AI_HUB_API_KEY=your-ai-hub-api-key

# Zigbee2MQTT
MQTT_BROKER=10.0.20.20
MQTT_PORT=1883
MQTT_USER=your-mqtt-user
MQTT_PASSWORD=your-mqtt-password

# Frigate NVR
FRIGATE_HOST=10.0.20.30
FRIGATE_PORT=5000
```

### 2. Start Services

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Login

Open http://localhost:3000 and login with your `ACCESS_TOKEN` from `.env`

## Configuration

### Add Servers

Edit `frontend/src/config/servers.ts`:

```typescript
export const SERVERS_CONFIG = {
  'my-server': {
    id: 'my-server',
    displayName: 'PVE-1',
    description: 'Main Server',
    color: '#9b87f5',
    // ... AI hooks
  }
}
```

### Add Smart Devices

Edit `frontend/src/config/devices.ts`:

```typescript
export const DEVICES_CONFIG = {
  'living-room-light': {
    id: 'living-room-light',
    name: 'Living Room Light',
    room: 'Living Room',
    type: 'switch',
    topic: 'zigbee2mqtt/living-room-light',
    canvasPosition: { x: 120, y: 340 },
    icon: 'Lightbulb'
  }
}
```

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Updating

### Pull Latest Changes

```bash
git pull origin main
```

### Rebuild Containers

```bash
docker compose build
docker compose up -d
```

## Troubleshooting

### Frontend not loading

```bash
# Check container logs
docker compose logs frontend

# Rebuild frontend
docker compose build frontend
docker compose up -d frontend
```

### Backend errors

```bash
# Check container logs
docker compose logs backend

# Check environment variables
docker compose exec backend env | grep -E 'PROXMOX|MQTT|FRIGATE'
```

### Can't connect to Proxmox

1. Check Proxmox credentials in `.env`
2. Verify network connectivity:
   ```bash
   docker compose exec backend ping PROXMOX_HOST
   ```
3. Check SSL settings (set `PROXMOX_VERIFY_SSL=false` for self-signed certs)

### MQTT devices not updating

1. Check MQTT broker connection in logs
2. Verify MQTT credentials in `.env`
3. Test MQTT connection:
   ```bash
   docker compose exec backend python -c "import paho.mqtt.client as mqtt; client = mqtt.Client(); client.connect('BROKER_IP', 1883)"
   ```

### AI Chat not working

1. Verify AI Hub is running and accessible
2. Check `AI_HUB_BASE_URL` and `AI_HUB_API_KEY` in `.env`
3. Test connection:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" http://AI_HUB_HOST:8080/health
   ```

## API Documentation

Interactive API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Architecture Details

### Backend (FastAPI)

- **Framework**: FastAPI + Uvicorn
- **Database**: SQLite (for logs/cache)
- **Real-time**: SSE (Server-Sent Events)
- **Authentication**: JWT tokens

### Frontend (React)

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand + TanStack Query
- **Charts**: Apache ECharts

### External Services

- **Proxmox VE**: Server/VM management
- **Zigbee2MQTT**: Smart device bridge
- **Frigate NVR**: Camera/AI detection
- **AI Hub**: Claude API proxy

## Security Notes

1. **Change default tokens** in `.env` before deployment
2. **Use strong JWT secret** (minimum 32 characters)
3. **Enable SSL/TLS** for production (reverse proxy recommended)
4. **Restrict network access** using firewall rules
5. **Regular backups** of `./data` directory

## Support

For issues and questions:
- Check logs: `docker compose logs`
- Review documentation in `backend/README.md` and `frontend/README.md`
- Open GitHub issue

## License

Private - Home Infrastructure Management System
