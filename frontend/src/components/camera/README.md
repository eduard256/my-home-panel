# WebRTC Camera System

## Overview

Professional WebRTC camera streaming system with intelligent connection management designed to prevent browser overload when displaying multiple camera feeds simultaneously.

## Architecture

### Components

1. **WebRTCPlayer** - Individual camera player component
2. **ConnectionManager** - Global singleton managing all camera connections
3. **Priority Queue System** - Ensures important cameras connect first

## How It Works

### Problem Solved

When displaying 10+ camera feeds simultaneously, browsers (especially Brave/Chromium) can become overwhelmed:
- **Browser limits**: Maximum concurrent WebSocket/WebRTC connections
- **Server limits**: go2rtc can't handle all connections starting at once
- **Resource exhaustion**: CPU/memory spikes causing crashes

### Solution

**Priority-Based Connection Queue**
```
┌─────────────────┐
│   CameraGrid    │
│   (13 cameras)  │
└────────┬────────┘
         │
         │ All cameras request connection
         ▼
┌─────────────────────────────────┐
│    ConnectionManager            │
│  ┌───────────────────────────┐  │
│  │   Priority Queue          │  │
│  │  1. birdseye    (p=100)   │  │
│  │  2. camera_1    (p=12)    │  │
│  │  3. camera_2    (p=11)    │  │
│  │  ...                      │  │
│  └───────────────────────────┘  │
│                                 │
│  Max Concurrent: 4              │
│  Delay Between: 800ms           │
└─────────────────────────────────┘
         │
         │ Controlled release
         ▼
┌─────────────────────────────────┐
│    4 cameras connect            │
│    simultaneously               │
└─────────────────────────────────┘
         │
         │ 800ms delay
         ▼
┌─────────────────────────────────┐
│    Next 4 cameras connect       │
└─────────────────────────────────┘
```

## Configuration

### ConnectionManager Settings

```typescript
new CameraConnectionManager(
  4,     // maxConcurrent: Max simultaneous connections
  800,   // connectDelay: Delay between batches (ms)
  5000   // retryDelay: Retry failed connections after (ms)
)
```

**Default values (optimized for reliability):**
- `maxConcurrent: 4` - Balance between speed and stability
- `connectDelay: 800ms` - Prevents server overload
- `retryDelay: 5000ms` - Automatic retry for failed connections

### Priority System

Higher priority = connects first

```typescript
// Example priorities in CamerasSection.tsx
const priority = camera.large ? 100 : (GO2RTC_CAMERAS.length - index);

// Specific examples:
// - birdseye (large camera): priority = 100
// - first camera in grid: priority = 12
// - last camera in grid: priority = 1
// - detail view camera: priority = 1000 (highest)
```

## Usage

### Basic Usage

```tsx
import { WebRTCPlayer } from '@/components/camera/WebRTCPlayer';

function CameraView() {
  return (
    <WebRTCPlayer
      camera="birdseye"
      className="w-full h-full"
      priority={100}
    />
  );
}
```

### With Priority

```tsx
// Grid of cameras with priority based on position
{cameras.map((camera, index) => (
  <WebRTCPlayer
    key={camera.name}
    camera={camera.name}
    priority={cameras.length - index} // First camera gets highest priority
  />
))}
```

### Detail View (Maximum Priority)

```tsx
// Detail view should load immediately
<WebRTCPlayer
  camera={cameraName}
  priority={1000} // Maximum priority
/>
```

## Connection States

The `WebRTCPlayer` component manages the following states:

1. **queued** - Waiting in connection queue
2. **connecting** - Establishing WebSocket/WebRTC connection
3. **connected** - Streaming video successfully
4. **error** - Connection failed
5. **disconnected** - Connection lost (will auto-retry)

## Features

### 1. Intelligent Queue Management

- Cameras connect in priority order
- Prevents browser overload
- Automatic batching with delays

### 2. Connection Monitoring

Detailed console logging for debugging:

```
[ConnectionManager] Initialized with maxConcurrent=4, delay=800ms
[ConnectionManager] Adding birdseye to queue with priority 100
[ConnectionManager] Connecting birdseye (1/4) - Queue: 12 remaining
[birdseye] Connection attempt #1
[birdseye] WebSocket connected
[birdseye] Received track: video
[birdseye] Connection state: connected
[ConnectionManager] Camera birdseye connected successfully
```

### 3. Error Handling

- Automatic retry for failed connections
- Graceful degradation
- Prevents cascade failures

### 4. Auto-Play Management

Handles browser auto-play restrictions:
- Silently ignores AbortError (expected during track switching)
- Logs other playback errors for debugging
- Works with strict browser policies (Brave, Safari)

### 5. Resource Cleanup

Proper cleanup on component unmount:
- Closes WebSocket connections
- Terminates RTCPeerConnection
- Clears video srcObject
- Cancels retry timers

## Browser Compatibility

Tested and working on:
- ✅ **Windows 11 + Edge** - Excellent (all cameras load)
- ✅ **Fedora Linux + Brave** - Good (with connection management)
- ✅ **Chrome** - Excellent
- ✅ **Firefox** - Good
- ⚠️ **Safari** - Limited WebRTC support

## Troubleshooting

### Only First 3 Cameras Load

**Problem:** Browser hitting concurrent connection limit

**Solution:** Already implemented via ConnectionManager
- Reduces concurrent connections to 4
- Adds 800ms delay between batches
- Priority ensures important cameras load first

### All Cameras Show "Queued"

**Problem:** ConnectionManager not processing queue

**Check:**
1. Console logs for ConnectionManager activity
2. Network tab for WebSocket connections
3. Token authentication

### Frequent Disconnections

**Problem:** Network instability or server overload

**Solutions:**
- Increase `connectDelay` to 1000ms+
- Reduce `maxConcurrent` to 3
- Check server capacity (go2rtc logs)

### AbortError in Console

**Status:** Normal and expected

These errors are harmless:
- "interrupted by new load request" - Multiple tracks arriving
- "interrupted because media was removed" - Component unmounting

They're automatically handled and don't affect functionality.

## Performance Optimization

### Tips for Best Performance

1. **Use sub streams for grid view**
   ```typescript
   { name: '10_0_20_111_sub', mainStream: '10_0_20_111_main' }
   ```

2. **Use main streams only in detail view**
   ```typescript
   <WebRTCPlayer camera={camera.mainStream} priority={1000} />
   ```

3. **Adjust concurrent connections based on network**
   - Fast network: `maxConcurrent: 6`
   - Slow network: `maxConcurrent: 3`

4. **Set appropriate priorities**
   - Critical cameras: 100+
   - Normal cameras: 10-50
   - Less important: 1-10

## API Reference

### WebRTCPlayer Props

```typescript
interface WebRTCPlayerProps {
  camera: string;        // Camera stream ID (from go2rtc)
  className?: string;    // CSS classes for container
  priority?: number;     // Connection priority (default: 0)
}
```

### ConnectionManager Methods

```typescript
class CameraConnectionManager {
  // Request connection for a camera
  requestConnection(
    cameraId: string,
    priority: number,
    onConnect: () => void,
    onError: () => void
  ): void;

  // Mark camera as connected
  markConnected(cameraId: string): void;

  // Mark camera as failed
  markFailed(cameraId: string): void;

  // Mark camera as disconnected
  markDisconnected(cameraId: string): void;

  // Get connection statistics
  getStats(): {
    active: number;
    queued: number;
    failed: number;
    maxConcurrent: number;
  };

  // Get list of failed cameras
  getFailedCameras(): string[];
}
```

## Advanced Configuration

### Custom Connection Manager

```typescript
import { CameraConnectionManager } from './ConnectionManager';

// Create custom instance for specific use case
export const customConnectionManager = new CameraConnectionManager(
  6,     // More concurrent connections for fast network
  500,   // Faster delays
  3000   // Quicker retry
);
```

### Per-Browser Optimization

```typescript
// Detect browser and adjust settings
const isBrave = navigator.brave !== undefined;
const maxConcurrent = isBrave ? 3 : 6;

export const connectionManager = new CameraConnectionManager(
  maxConcurrent,
  800,
  5000
);
```

## Contributing

When modifying the camera system:

1. **Test on multiple browsers** (Edge, Brave, Chrome, Firefox)
2. **Monitor console logs** for connection patterns
3. **Check Network tab** for WebSocket/WebRTC traffic
4. **Test with 10+ cameras** to verify queue behavior
5. **Verify auto-retry** by temporarily breaking a camera

## License

Part of my-home-panel project
