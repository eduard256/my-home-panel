import { useState } from 'react';
import { X, ExternalLink, MapPin, Eye, Activity } from 'lucide-react';
import { formatRelativeTime, formatTime } from '@/lib/utils';
import { useCameraEvents, getEventSnapshotUrl } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WebRTCPlayer } from '@/components/camera/WebRTCPlayer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CameraEvent } from '@/types';

// go2rtc camera info
const GO2RTC_CAMERAS = [
  { name: '10_0_20_111_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_111_sub', fps: 15, status: 'online' as const, width: 640, height: 480, zones: [], detection_enabled: false },
  { name: '10_0_20_116_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_118_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_118_sub', fps: 15, status: 'online' as const, width: 640, height: 480, zones: [], detection_enabled: false },
  { name: '10_0_20_119_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_119_sub', fps: 15, status: 'online' as const, width: 640, height: 480, zones: [], detection_enabled: false },
  { name: '10_0_20_120_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_120_sub', fps: 15, status: 'online' as const, width: 640, height: 480, zones: [], detection_enabled: false },
  { name: '10_0_20_122_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_122_sub', fps: 15, status: 'online' as const, width: 640, height: 480, zones: [], detection_enabled: false },
  { name: '10_0_20_123_main', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: '10_0_20_123_sub', fps: 15, status: 'online' as const, width: 640, height: 480, zones: [], detection_enabled: false },
  { name: 'birdseye', fps: 10, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_0', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_1', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_2', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_3', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_4', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_5', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_6', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
  { name: 'zosi_nvr_7', fps: 15, status: 'online' as const, width: 1920, height: 1080, zones: [], detection_enabled: false },
];

/**
 * Minimal Event Thumbnail
 */
function EventThumb({ event, onClick }: { event: CameraEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-video rounded overflow-hidden bg-black/50 group"
    >
      <img
        src={getEventSnapshotUrl(event.id)}
        alt={event.label}
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
      />
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between text-[10px] text-white">
          <span className="font-bold">{event.label.toUpperCase()}</span>
          <span>{formatTime(event.start_time)}</span>
        </div>
      </div>
    </button>
  );
}

/**
 * Professional Camera Detail View
 * Full-screen player with minimal UI
 */
export function CameraDetail({ name }: { name: string }) {
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);
  const { closeBlock3 } = useNavigationStore();
  const { data: events } = useCameraEvents(name, { limit: 12, hasSnapshot: true });

  // Find camera in our list
  const camera = GO2RTC_CAMERAS.find(c => c.name === name);

  if (!camera) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="text-white/40 text-sm">Camera not found</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black flex flex-col">
      {/* Header - Minimal */}
      <div className="flex-shrink-0 px-6 py-4 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-lg font-medium tracking-wide">
              {camera.name.toUpperCase()}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={camera.status === 'online' ? 'default' : 'destructive'} className="text-[10px]">
                {camera.status.toUpperCase()}
              </Badge>
              {camera.detection_enabled && (
                <Badge variant="default" className="bg-blue-600 text-[10px]">
                  <Eye className="w-3 h-3 mr-1" />
                  DETECTION
                </Badge>
              )}
              <span className="text-white/40 text-xs font-mono">{camera.fps} FPS</span>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={closeBlock3} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Player - Full Width */}
      <div className="flex-1 bg-black relative">
        <WebRTCPlayer camera={name} className="w-full h-full" />

        {/* Live Indicator */}
        {camera.status === 'online' && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600/90 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Bottom Panel - Events & Info */}
      <div className="flex-shrink-0 bg-black/95 backdrop-blur-sm border-t border-white/5">
        {/* Events Row */}
        {events && events.length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-white/60 text-xs font-mono mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              RECENT EVENTS
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {events.map((event) => (
                <EventThumb key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
              ))}
            </div>
          </div>
        )}

        {/* Info Row */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-white/40 text-[10px] font-mono block">RESOLUTION</span>
              <span className="text-white text-sm font-mono">
                {camera.width}×{camera.height}
              </span>
            </div>
            <div>
              <span className="text-white/40 text-[10px] font-mono block">FPS</span>
              <span className="text-white text-sm font-mono">{camera.fps}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('http://localhost:5000', '_blank')}
            className="text-white/60 border-white/10 hover:border-white/20"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            FRIGATE
          </Button>
        </div>
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl bg-black border-white/10">
          {selectedEvent && (
            <div className="p-4">
              <img
                src={getEventSnapshotUrl(selectedEvent.id)}
                alt={selectedEvent.label}
                className="w-full rounded"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">{selectedEvent.label.toUpperCase()}</Badge>
                  {selectedEvent.zone && (
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {selectedEvent.zone}
                    </Badge>
                  )}
                  <span className="text-white/40 text-xs font-mono">
                    {Math.round(selectedEvent.score * 100)}% confidence
                  </span>
                </div>
                <span className="text-white/60 text-sm">{formatRelativeTime(selectedEvent.start_time)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
