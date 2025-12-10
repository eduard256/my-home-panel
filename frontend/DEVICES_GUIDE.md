# Smart Devices Guide - Vadim's Room

Beautiful interactive control panel for smart home devices in Vadim's room.

## 🎨 Features

### 🏠 Room Plan Layout
- Devices organized in elegant sections (Lighting, Window Treatments)
- Smooth animations with Framer Motion
- Responsive grid layout
- Custom themed design for each room

### 💡 Dual Switch Control
**Device:** `main-vadim-room-light`

Features:
- **Two independent light controls:**
  - Left: Side Light (Amber glow)
  - Right: Ceiling (Yellow glow)
- **All On/Off** quick toggle button
- Beautiful glow effects when lights are on
- Real-time state synchronization
- Link quality indicator

Controls:
```json
{
  "state_left": "ON",   // Side light
  "state_right": "OFF"  // Ceiling light
}
```

### 🌈 RGB Strip Control
**Device:** `main-vadim-bed-yeelight`

Features:
- **Color Temperature Slider:** Smooth gradient from warm red to cool blue
- **Brightness Control:** 0-100% with real-time preview
- **Quick Presets:** Warm Red, Amber, Warm White (3 preset buttons)
- **Live Preview:** Large color preview with ambient glow effect
- **Power Toggle:** Quick on/off control

Color Temperature Scale:
- 0% = Warm Red (255, 0, 0) - Maximum warmth
- 20% = Orange (255, 100, 0)
- 40% = Amber (255, 180, 0)
- 60% = Warm White (255, 220, 180)
- 80% = Neutral (255, 255, 220)
- 100% = Cool (200, 220, 255) - Minimum temperature

Controls:
```json
{
  "state": "ON",
  "color": { "r": 255, "g": 220, "b": 180 },
  "brightness": 75
}
```

### 🪟 Animated Curtain Control
**Device:** `main-vadim-window-curtain`

Features:
- **Beautiful Window Visualization:**
  - Animated sun with pulsing rays
  - Smooth curtain opening/closing animation
  - Sky gradient background
  - Realistic curtain texture
- **Position Slider:** Precise control 0-100%
- **Quick Presets:**
  - Fully Open (100%) - Maximum light
  - Half Open (50%) - Partial light
  - Closed (0%) - Privacy mode
- **Stop Button:** Emergency stop during movement
- **Real-time Animation:** Spring physics for smooth movement

Controls:
```json
{
  "position": 50    // 0 = closed, 100 = fully open
}
```

Stop command:
```json
{
  "state": "STOP"
}
```

## 🎯 Design Highlights

### Visual Effects
- **Glow Effects:** Active devices emit ambient light
- **Smooth Animations:** Spring physics for natural movement
- **Color Gradients:** Beautiful transitions in RGB control
- **Responsive Hover:** Scale effects on interaction
- **Real-time Feedback:** Instant visual updates

### User Experience
- **Intuitive Controls:** Touch-friendly sliders and buttons
- **Visual Feedback:** Clear active/inactive states
- **Quick Access:** Preset buttons for common scenarios
- **Accessible:** Clear labels and descriptions

## 📱 Layout Structure

```
Vadim's Room
├── 💡 Lighting Section
│   ├── Room Light (Dual Switch)
│   │   ├── Side Light (Left)
│   │   └── Ceiling (Right)
│   └── Bed RGB Strip
│       ├── Temperature Slider
│       ├── Brightness Slider
│       └── Quick Presets
└── 🪟 Window Treatments Section
    └── Window Curtain
        ├── Animated Visualization
        ├── Position Slider
        └── Quick Presets (100%, 50%, 0%)
```

## 🔧 Configuration

All devices are configured in `frontend/src/config/devices.ts`:

```typescript
export const DEVICES_CONFIG: Record<string, DeviceConfig> = {
  'main-vadim-room-light': {
    id: 'main-vadim-room-light',
    name: 'Room Light',
    room: 'Vadim',
    type: 'dual-switch',
    topic: 'zigbee2mqtt/main-vadim-room-light',
    canvasPosition: { x: 300, y: 100 },
    icon: 'Lightbulb',
  },
  // ... more devices
};
```

## 🎨 Color Scheme

Vadim's room uses an **Indigo** theme:
- Primary: `rgba(99, 102, 241, 0.05)` - Subtle indigo background
- Accents: Dynamic colors based on device state
- Glow effects: Match device colors (amber, yellow, indigo)

## 🚀 Components

### Custom Device Cards
- `DualSwitchCard.tsx` - Two-button light control
- `RGBStripCard.tsx` - Temperature-based color control
- `CurtainCard.tsx` - Animated curtain visualization
- `RoomPlanLayout.tsx` - Room-specific layout manager

### Reusable UI
- Framer Motion animations
- Shadcn/ui components (Slider, Badge)
- Lucide React icons
- Tailwind CSS styling

## 📊 MQTT Topics

### Dual Switch
- **Topic:** `zigbee2mqtt/main-vadim-room-light/set`
- **Commands:** `state_left`, `state_right`

### RGB Strip
- **Topic:** `automation_devices/main-vadim-bed-yeelight/set`
- **Commands:** `state`, `color`, `brightness`

### Curtain
- **Topic:** `zigbee2mqtt/main-vadim-window-curtain/set`
- **Commands:** `position`, `state` (STOP)

## 🎭 Animation Details

### Curtain Animation
- **Type:** Spring physics
- **Duration:** ~1 second
- **Easing:** Natural spring with damping
- **Effects:**
  - Sun pulsing animation (3s loop)
  - Light rays opacity animation
  - Curtain height transition
  - Position badge scale-in

### RGB Strip
- **Ambient Glow:** Matches current color with 30% opacity and blur
- **Color Transitions:** Smooth interpolation between presets
- **Preview Scale:** Pop-in animation when turning on

### Dual Switch
- **Glow Effects:** Gradient backgrounds with blur
- **Button Tap:** Scale 0.95 on click
- **State Changes:** Fade transitions

## 🔥 Performance

- **Debounced Updates:** Slider changes batched for MQTT
- **Optimized Rendering:** React memo for device cards
- **Smooth Animations:** GPU-accelerated transforms
- **Efficient State:** Zustand store with selective updates

---

Made with ❤️ for smart home automation
