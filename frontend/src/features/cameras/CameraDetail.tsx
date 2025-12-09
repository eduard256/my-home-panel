import { useEffect, useState, useRef } from 'react';
import { Camera, Video, Eye, Volume2, VolumeX, Maximize, Settings, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, SkeletonCard } from '@/shared/components/ui';
import { frigate } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { Camera as CameraType, CameraEvent } from '@/shared/types';

function formatEventTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatEventDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function CameraDetail() {
  const { selectedCameraId } = useUIStore();
  const [camera, setCamera] = useState<CameraType | null>(null);
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!selectedCameraId) return;

    const fetchData = async () => {
      try {
        const [cameraRes, eventsRes] = await Promise.all([
          frigate.getCamera(selectedCameraId),
          frigate.getCameraEvents(selectedCameraId),
        ]);
        setCamera(cameraRes);
        setEvents(eventsRes.events);
      } catch (error) {
        console.error('Failed to fetch camera data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedCameraId]);

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      videoRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // No AI chat for cameras as per requirements
  // Show placeholder if no camera selected
  if (!selectedCameraId) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-4">
            <Camera size={32} className="text-[#3b82f6]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Выберите камеру</h3>
          <p className="text-sm text-[#a0a0a8]">Кликните на камеру слева для просмотра</p>
        </div>
      </div>
    );
  }

  if (loading || !camera) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-lg p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
              <Camera size={20} className="text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{camera.name}</h2>
              <span className="text-xs text-[#6b6b70]">
                {camera.width}x{camera.height} @ {camera.fps}fps
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {camera.detect?.enabled && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#10b981]/20 text-[#10b981]">
                Detect ON
              </span>
            )}
            {camera.record?.enabled && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#ef4444]/20 text-[#ef4444]">
                REC
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Video player */}
        <Card hoverable={false}>
          <CardContent>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              {camera.enabled ? (
                <>
                  <img
                    ref={videoRef as any}
                    src={`/api/frigate/cameras/${camera.name}/latest?t=${Date.now()}`}
                    alt={camera.name}
                    className="w-full h-full object-contain"
                  />

                  {/* Live indicator */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-xs text-white flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </div>

                  {/* Controls overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleFullscreen}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <Maximize size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[#6b6b70]">
                  <div className="text-center">
                    <Camera size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Камера отключена</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            leftIcon={<Eye size={16} />}
            onClick={() => {}}
          >
            {camera.detect?.enabled ? 'Выкл. детекцию' : 'Вкл. детекцию'}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Video size={16} />}
            onClick={() => {}}
          >
            {camera.record?.enabled ? 'Выкл. запись' : 'Вкл. запись'}
          </Button>
        </div>

        {/* Stats */}
        {camera.stats && (
          <Card hoverable={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={18} className="text-[#9b87f5]" />
                Статистика
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-xs text-[#a0a0a8] uppercase mb-1">Detection FPS</div>
                  <div className="text-2xl font-bold text-white">
                    {camera.stats.detection_fps?.toFixed(1) || '--'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-xs text-[#a0a0a8] uppercase mb-1">Process FPS</div>
                  <div className="text-2xl font-bold text-white">
                    {camera.stats.process_fps?.toFixed(1) || '--'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-xs text-[#a0a0a8] uppercase mb-1">Inference</div>
                  <div className="text-2xl font-bold text-white">
                    {camera.stats.inference_speed?.toFixed(0) || '--'} ms
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-xs text-[#a0a0a8] uppercase mb-1">Сегодня событий</div>
                  <div className="text-2xl font-bold text-white">
                    {camera.events_today || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent events */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#f59e0b]" />
              Последние события
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {/* Event thumbnail */}
                    <div className="w-20 h-14 rounded overflow-hidden bg-[#16161d] flex-shrink-0">
                      {event.thumbnail && (
                        <img
                          src={`/api/frigate/events/${event.id}/thumbnail`}
                          alt={event.label}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white capitalize">
                          {event.label}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">
                          {(event.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6b6b70]">
                        <Clock size={10} />
                        {formatEventTime(event.start_time)}
                        <Calendar size={10} />
                        {formatEventDate(event.start_time)}
                      </div>
                      {event.zones && event.zones.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {event.zones.map((zone: string) => (
                            <span
                              key={zone}
                              className="text-xs px-1 py-0.5 rounded bg-white/10 text-[#a0a0a8]"
                            >
                              {zone}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6b6b70]">
                <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет событий</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camera info */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={18} className="text-[#6b6b70]" />
              Информация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">Разрешение</span>
                <span className="text-white">{camera.width}x{camera.height}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">FPS</span>
                <span className="text-white">{camera.fps}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">Детекция</span>
                <span className={camera.detect?.enabled ? 'text-[#10b981]' : 'text-[#6b6b70]'}>
                  {camera.detect?.enabled ? 'Включена' : 'Выключена'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">Запись</span>
                <span className={camera.record?.enabled ? 'text-[#ef4444]' : 'text-[#6b6b70]'}>
                  {camera.record?.enabled ? 'Включена' : 'Выключена'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">Снапшоты</span>
                <span className={camera.snapshots?.enabled ? 'text-[#3b82f6]' : 'text-[#6b6b70]'}>
                  {camera.snapshots?.enabled ? 'Включены' : 'Выключены'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
