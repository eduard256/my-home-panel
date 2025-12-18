import { motion } from 'framer-motion';
import { Camera, Maximize2 } from 'lucide-react';
import { useNavigationStore } from '@/stores';
import { WebRTCPlayer } from '@/components/camera/WebRTCPlayer';

// go2rtc camera streams
// For preview: use sub stream (low quality), for fullscreen: use main stream (high quality)
const GO2RTC_CAMERAS = [
  { name: 'birdseye', mainStream: 'birdseye', fps: 10, status: 'online' as const, large: true }, // First - takes 2x2 cells
  { name: '10_0_20_111_sub', mainStream: '10_0_20_111_main', fps: 15, status: 'online' as const },
  { name: '10_0_20_116_main', mainStream: '10_0_20_116_main', fps: 15, status: 'online' as const },
  { name: '10_0_20_118_sub', mainStream: '10_0_20_118_main', fps: 15, status: 'online' as const },
  { name: '10_0_20_119_sub', mainStream: '10_0_20_119_main', fps: 15, status: 'online' as const },
  { name: '10_0_20_120_sub', mainStream: '10_0_20_120_main', fps: 15, status: 'online' as const },
  { name: '10_0_20_122_sub', mainStream: '10_0_20_122_main', fps: 15, status: 'online' as const },
  { name: '10_0_20_123_sub', mainStream: '10_0_20_123_main', fps: 15, status: 'online' as const },
  { name: 'zosi_nvr_2', mainStream: 'zosi_nvr_2', fps: 15, status: 'online' as const },
  { name: 'zosi_nvr_3', mainStream: 'zosi_nvr_3', fps: 15, status: 'online' as const },
  { name: 'zosi_nvr_4', mainStream: 'zosi_nvr_4', fps: 15, status: 'online' as const },
  { name: 'zosi_nvr_5', mainStream: 'zosi_nvr_5', fps: 15, status: 'online' as const },
  { name: 'zosi_nvr_6', mainStream: 'zosi_nvr_6', fps: 15, status: 'online' as const },
];

/**
 * Professional Camera Grid Cell
 * Minimalist design inspired by $60k enterprise systems
 */
function CameraCell({ camera, index }: { camera: typeof GO2RTC_CAMERAS[0]; index: number }) {
  const { openDetail } = useNavigationStore();

  // Priority calculation:
  // - Birdseye gets highest priority (100)
  // - Other cameras get priority based on reverse index (first camera = highest)
  const priority = camera.large ? 100 : (GO2RTC_CAMERAS.length - index);

  return (
    <div className="relative group w-full h-full bg-black overflow-hidden">
      {/* WebRTC Stream - Use priority-based connection management */}
      <WebRTCPlayer camera={camera.name} className="w-full h-full" priority={priority} />

      {/* Minimal Overlay - Only on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Top Bar - Camera Name */}
        <div className="absolute top-0 left-0 right-0 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium tracking-wide">
              {camera.name.toUpperCase()}
            </span>
            <div className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* Bottom Bar - Info */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-xs font-mono">{camera.fps} FPS</span>
            <button
              onClick={() => openDetail('cameras', camera.mainStream)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Live Indicator - Always Visible */}
        {camera.status === 'online' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-red-600/90 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-bold tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Offline Overlay */}
      {camera.status !== 'online' && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center">
            <Camera className="w-8 h-8 text-white/40 mx-auto mb-2" />
            <span className="text-white/60 text-xs">OFFLINE</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Enterprise-Grade Cameras Grid
 * Desktop: Full-screen, no padding, seamless grid
 * Mobile: Scrollable grid with 3 cameras visible
 */
export function CamerasSection() {
  const cameras = GO2RTC_CAMERAS;

  // Calculate optimal grid layout for DESKTOP
  const getGridLayout = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    if (count <= 16) return { cols: 4, rows: 4 };
    return { cols: 5, rows: Math.ceil(count / 5) };
  };

  const layout = getGridLayout(cameras.length);
  const gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
  const gridTemplateRows = `repeat(${layout.rows}, 1fr)`;

  return (
    <div className="h-full w-full bg-black relative">
      {/* DESKTOP: Full-screen grid without scroll */}
      <div
        className="hidden lg:grid h-full w-full gap-[1px] bg-gray-900"
        style={{
          gridTemplateColumns,
          gridTemplateRows
        }}
      >
        {cameras.map((camera, index) => (
          <motion.div
            key={camera.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="relative overflow-hidden"
            style={camera.large ? { gridColumn: 'span 2', gridRow: 'span 2' } : undefined}
          >
            <CameraCell camera={camera} index={index} />
          </motion.div>
        ))}
      </div>

      {/* MOBILE: Scrollable grid - 1 column, 3 cameras visible at once */}
      <div className="lg:hidden h-full w-full overflow-y-auto">
        <div className="grid grid-cols-1 gap-[1px] bg-gray-900">
          {cameras.map((camera, index) => (
            <motion.div
              key={camera.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="relative overflow-hidden"
              style={{ height: 'calc(33.333vh - 0.5px)' }}
            >
              <CameraCell camera={camera} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Minimal Status Bar - Top Left */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 z-10">
        <span className="text-white/80 text-xs font-mono">
          {cameras.filter((c) => c.status === 'online').length}/{cameras.length} ONLINE
        </span>
      </div>
    </div>
  );
}
