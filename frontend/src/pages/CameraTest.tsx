import { WebRTCPlayer } from '@/components/camera/WebRTCPlayer';

// All available cameras from go2rtc
const CAMERAS = [
  { id: '10_0_20_111_main', name: 'Camera 111 Main' },
  { id: '10_0_20_111_sub', name: 'Camera 111 Sub' },
  { id: '10_0_20_116_main', name: 'Camera 116 Main' },
  { id: '10_0_20_118_main', name: 'Camera 118 Main' },
  { id: '10_0_20_118_sub', name: 'Camera 118 Sub' },
  { id: '10_0_20_119_main', name: 'Camera 119 Main' },
  { id: '10_0_20_119_sub', name: 'Camera 119 Sub' },
  { id: '10_0_20_120_main', name: 'Camera 120 Main' },
  { id: '10_0_20_120_sub', name: 'Camera 120 Sub' },
  { id: '10_0_20_122_main', name: 'Camera 122 Main' },
  { id: '10_0_20_122_sub', name: 'Camera 122 Sub' },
  { id: '10_0_20_123_main', name: 'Camera 123 Main' },
  { id: '10_0_20_123_sub', name: 'Camera 123 Sub' },
  { id: 'birdseye', name: 'Birdseye View' },
  { id: 'zosi_nvr_0', name: 'ZOSI NVR 0' },
  { id: 'zosi_nvr_1', name: 'ZOSI NVR 1' },
  { id: 'zosi_nvr_2', name: 'ZOSI NVR 2' },
  { id: 'zosi_nvr_3', name: 'ZOSI NVR 3' },
  { id: 'zosi_nvr_4', name: 'ZOSI NVR 4' },
  { id: 'zosi_nvr_5', name: 'ZOSI NVR 5' },
  { id: 'zosi_nvr_6', name: 'ZOSI NVR 6' },
  { id: 'zosi_nvr_7', name: 'ZOSI NVR 7' },
];

export default function CameraTest() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1920px] mx-auto">
        <h1 className="text-3xl font-bold mb-6">Camera WebRTC Test (Native)</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Using native WebRTC API for low-latency streaming
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CAMERAS.map((camera, index) => (
            <div key={camera.id} className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="font-semibold text-sm">{camera.name}</h3>
                <p className="text-xs text-muted-foreground">{camera.id}</p>
              </div>
              <div className="aspect-video bg-black relative">
                {/* Priority based on index - first cameras load first */}
                <WebRTCPlayer
                  camera={camera.id}
                  className="relative w-full h-full"
                  priority={CAMERAS.length - index}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
