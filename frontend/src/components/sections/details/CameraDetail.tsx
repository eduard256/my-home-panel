import { useState, useEffect } from 'react';
import {
  Camera,
  X,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
  MapPin,
  Clock,
  User,
} from 'lucide-react';
import { formatRelativeTime, formatTime } from '@/lib/utils';
import { useCamera, useCameraEvents, getCameraSnapshotUrl, getEventSnapshotUrl } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { BarChart } from '@/components/charts';
import type { CameraEvent } from '@/types';

/**
 * Event Card component
 */
function EventCard({
  event,
  onClick,
}: {
  event: CameraEvent;
  onClick: () => void;
}) {
  const snapshotUrl = event.has_snapshot ? getEventSnapshotUrl(event.id) : null;

  return (
    <button
      onClick={onClick}
      className="relative rounded-lg overflow-hidden aspect-video bg-dark-bg group"
    >
      {snapshotUrl ? (
        <img
          src={snapshotUrl}
          alt={event.label}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <div className="flex items-center justify-between">
          <Badge variant="default" className="text-[10px]">
            {event.label}
          </Badge>
          <span className="text-[10px] text-white/80">{formatTime(event.start_time)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          {event.zone && (
            <span className="text-[10px] text-white/60 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {event.zone}
            </span>
          )}
          <span className="text-[10px] text-white/60">{Math.round(event.score * 100)}%</span>
        </div>
      </div>
    </button>
  );
}

/**
 * CameraDetail - Detailed view of a camera with events
 */
export function CameraDetail({ name }: { name: string }) {
  const [snapshotKey, setSnapshotKey] = useState(Date.now());
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);

  const { closeBlock3 } = useNavigationStore();
  const { data: camera, isLoading } = useCamera(name);
  const { data: events } = useCameraEvents(name, { limit: 20, hasSnapshot: true });

  // Auto-refresh snapshot every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshotKey(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenFrigate = () => {
    // Open Frigate web UI
    window.open('http://localhost:5000', '_blank');
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-[150px] w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="aspect-video w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Camera className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Camera not found</h3>
        <p className="text-sm text-muted">The requested camera could not be loaded.</p>
      </div>
    );
  }

  const snapshotUrl = getCameraSnapshotUrl(name, 90);

  // Generate hourly event counts for chart
  const hourlyEvents = camera.detection_stats || [];
  const chartData = hourlyEvents.map((s) => s.count);
  const chartLabels = hourlyEvents.map((s) => `${s.hour}:00`);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Cameras</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{camera.name}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={closeBlock3}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 mt-3">
          <Badge variant={camera.status === 'online' ? 'success' : 'destructive'}>
            {camera.status}
          </Badge>
          {camera.detection_enabled && (
            <Badge variant="success">
              <Eye className="h-3 w-3 mr-1" />
              Detection
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Large Snapshot */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-bg">
            <img
              key={snapshotKey}
              src={`${snapshotUrl}&t=${snapshotKey}`}
              alt={camera.name}
              className="w-full h-full object-cover"
            />

            {/* Live indicator */}
            {camera.status === 'online' && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/90">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-medium text-white">LIVE</span>
              </div>
            )}

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSnapshotKey(Date.now())}
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Detection Rate Chart */}
          {chartData.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Detection Rate (24h)</h3>
              <BarChart data={chartData} labels={chartLabels} color="#9b87f5" height={150} />
            </div>
          )}

          {/* Recent Events */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Recent Events
            </h3>

            {events && events.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Camera className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No recent events</p>
              </div>
            )}
          </div>

          {/* Zones */}
          {camera.zones.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Zones
              </h3>
              <div className="flex flex-wrap gap-2">
                {camera.zones.map((zone) => (
                  <Badge key={zone} variant="secondary">
                    {zone}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Resolution</span>
                <span className="text-white">
                  {camera.width}x{camera.height}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">FPS</span>
                <span className="text-white">{camera.fps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Detection</span>
                <span className={camera.detection_enabled ? 'text-success' : 'text-muted'}>
                  {camera.detection_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <Button variant="outline" onClick={handleOpenFrigate} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Frigate
          </Button>
        </div>
      </ScrollArea>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl">
          {selectedEvent && (
            <div>
              <img
                src={getEventSnapshotUrl(selectedEvent.id)}
                alt={selectedEvent.label}
                className="w-full rounded-lg"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Badge>{selectedEvent.label}</Badge>
                  {selectedEvent.zone && (
                    <Badge variant="secondary">{selectedEvent.zone}</Badge>
                  )}
                </div>
                <div className="text-sm text-muted flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatRelativeTime(selectedEvent.start_time)}
                </div>
              </div>
              <p className="text-sm text-muted mt-2">
                Confidence: {Math.round(selectedEvent.score * 100)}%
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
