import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Video, Eye, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatusDot, SkeletonList } from '@/shared/components/ui';
import { frigate } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { Camera as CameraType } from '@/shared/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function formatLastEvent(timestamp: string | null): string {
  if (!timestamp) return 'Нет событий';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;

  return date.toLocaleDateString('ru-RU');
}

export function CamerasOverview() {
  const { setSelectedCamera, setActiveBlock, isMobile } = useUIStore();
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await frigate.getCameras();
        setCameras(response.cameras);
      } catch (error) {
        console.error('Failed to fetch cameras:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
    const interval = setInterval(fetchCameras, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCameraClick = (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isMobile) {
      setActiveBlock(3);
    }
  };

  const enabledCameras = cameras.filter((c) => c.enabled).length;
  const detectingCameras = cameras.filter((c) => c.detect?.enabled).length;

  if (loading) {
    return <SkeletonList count={4} />;
  }

  return (
    <motion.div
      className="space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Camera size={20} className="text-[#3b82f6]" />
          Камеры
        </h1>
        <span className="text-sm text-[#a0a0a8]">
          {enabledCameras} активных, {detectingCameras} с детекцией
        </span>
      </motion.div>

      {/* Camera grid */}
      <div className="grid grid-cols-1 gap-4">
        {cameras.map((camera) => (
          <motion.div key={camera.name} variants={item}>
            <Card onClick={() => handleCameraClick(camera.name)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <StatusDot
                    status={camera.enabled ? 'online' : 'offline'}
                    size="lg"
                  />
                  <div className="flex-1">
                    <CardTitle>{camera.name}</CardTitle>
                    <span className="text-xs text-[#6b6b70]">
                      {camera.width}x{camera.height} @ {camera.fps}fps
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {camera.detect?.enabled && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#10b981]/20 text-[#10b981] flex items-center gap-1">
                        <Eye size={12} />
                        Detect
                      </span>
                    )}
                    {camera.record?.enabled && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#ef4444]/20 text-[#ef4444] flex items-center gap-1">
                        <Video size={12} />
                        Rec
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Camera preview placeholder */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#16161d] mb-4">
                  {camera.enabled ? (
                    <img
                      src={`/api/frigate/cameras/${camera.name}/latest`}
                      alt={camera.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#6b6b70]">
                      <div className="text-center">
                        <Camera size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Камера отключена</p>
                      </div>
                    </div>
                  )}

                  {/* Live indicator */}
                  {camera.enabled && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-xs text-white flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>

                {/* Detection stats */}
                {camera.detect?.enabled && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <div className="text-lg font-bold text-white">
                        {camera.stats?.detection_fps?.toFixed(1) || '--'}
                      </div>
                      <div className="text-xs text-[#a0a0a8]">Det FPS</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <div className="text-lg font-bold text-white">
                        {camera.stats?.process_fps?.toFixed(1) || '--'}
                      </div>
                      <div className="text-xs text-[#a0a0a8]">Proc FPS</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <div className="text-lg font-bold text-white">
                        {camera.stats?.inference_speed?.toFixed(0) || '--'}
                      </div>
                      <div className="text-xs text-[#a0a0a8]">Infer ms</div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <div className="flex items-center justify-between text-xs text-[#6b6b70] w-full">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatLastEvent(camera.last_event ?? null)}
                  </div>
                  {camera.events_today !== undefined && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {camera.events_today} событий сегодня
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {cameras.length === 0 && (
        <motion.div variants={item}>
          <Card hoverable={false}>
            <div className="text-center py-8 text-[#6b6b70]">
              <Camera size={32} className="mx-auto mb-2 opacity-50" />
              <p>Нет камер</p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
