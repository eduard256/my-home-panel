# Home Panel Frontend

Premium home infrastructure management interface with godlike UI/UX.

## Features

- **Three-Block Architecture**: Floating glass panels with smooth animations
- **Real-time Monitoring**: Live server metrics, VM status, camera feeds
- **AI Assistant**: Claude-powered infrastructure management
- **Smart Device Control**: Zigbee2MQTT device management
- **Responsive Design**: Desktop, tablet, and mobile support

## Tech Stack

- React 18.3 + TypeScript 5.3
- Vite 5+ (build tool)
- Tailwind CSS 3.4+ (styling)
- Framer Motion 11+ (animations)
- TanStack Query v5 (data fetching)
- Zustand 4+ (state management)
- Apache ECharts 5+ (charts)
- shadcn/ui (component library)

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Application will be available at http://localhost:3000

### Docker Build

```bash
# Build and run with Docker Compose (from project root)
docker-compose up -d frontend

# Or build standalone
docker build -t home-panel-frontend .
docker run -p 3000:80 home-panel-frontend
```

Application will be available at http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/         # Main layout, navigation, animated background
│   │   ├── ui/             # shadcn/ui components (14 components)
│   │   ├── charts/         # Chart components (Sparkline, LineChart, BarChart, Heatmap)
│   │   ├── sections/       # Main content sections (Servers, VMs, Automations, etc.)
│   │   └── features/       # Feature components (Login, AI Chat)
│   ├── config/             # Configuration files
│   │   ├── categories.ts   # Navigation categories
│   │   ├── servers.ts      # Server configurations
│   │   ├── devices.ts      # Smart device configurations
│   │   └── aiContexts.ts   # AI assistant contexts
│   ├── lib/                # Utilities
│   │   ├── api.ts          # API client (Axios + SSE)
│   │   └── utils.ts        # Utility functions
│   ├── hooks/              # React Query hooks
│   ├── stores/             # Zustand stores (auth, navigation, AI chat)
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles
├── Dockerfile              # Production Docker build
├── nginx.conf              # Nginx configuration
└── package.json
```

## Configuration

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

### Add Servers

Edit `src/config/servers.ts`:

```typescript
export const SERVERS_CONFIG = {
  'your-server-id': {
    id: 'your-server-id',
    displayName: 'PVE-1',
    description: 'Main Server',
    color: '#9b87f5',
    aiHooks: { /* ... */ }
  }
}
```

### Add Smart Devices

Edit `src/config/devices.ts`:

```typescript
export const DEVICES_CONFIG = {
  'device-id': {
    id: 'device-id',
    name: 'Living Room Light',
    room: 'Living Room',
    type: 'switch', // or 'dimmer', 'sensor'
    topic: 'zigbee2mqtt/device-id',
    canvasPosition: { x: 120, y: 340 },
    icon: 'Lightbulb'
  }
}
```

## Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Style

- TypeScript strict mode enabled
- No `any` types
- Functional components with hooks
- Tailwind CSS for styling
- Framer Motion for animations

## Design System

### Colors

- Primary: `#9b87f5` (purple)
- Background: `#0a0a0f` (dark)
- Card: `#16161d` (dark grey)
- Success: `#10b981` (green)
- Destructive: `#ef4444` (red)
- Warning: `#f59e0b` (orange)

### Typography

- Display: 72-96px bold
- Hero: 48-64px bold
- H1: 32-40px semibold
- H2: 24px semibold
- Body: 16px regular
- Small: 14px medium
- Tiny: 12px

### Spacing

4px grid system (4, 8, 12, 16, 20, 24, 32, 48px)

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Mobile: iOS Safari, Chrome Android

## Performance

- Code splitting by route
- Lazy loading for heavy components
- Image optimization (WebP with fallback)
- Chart data downsampling for long time ranges
- Canvas-based animations (GPU accelerated)

## License

Private - Home Infrastructure Management

## Support

For issues and questions, open a GitHub issue.
