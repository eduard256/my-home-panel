import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { cn, formatRelativeTime, formatTime } from '@/lib/utils';
import { useCameras, useCameraEvents, getCameraSnapshotUrl } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Camera as CameraType } from '@/types';

/**
 * Camera Card component with auto-refreshing snapshot
 */
function CameraCard({ camera }: { camera: CameraType }) {
  const { openDetail } = useNavigationStore();
  const [snapshotKey, setSnapshotKey] = useState(Date.now());
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch last event for this camera
  const { data: events } = useCameraEvents(camera.name, { limit: 1 });
  const lastEvent = events?.[0];

  // Auto-refresh snapshot every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshotKey(Date.now());
      setImageError(false);
      setIsLoading(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    openDetail('cameras', camera.name);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const snapshotUrl = getCameraSnapshotUrl(camera.name, 70);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="card overflow-hidden cursor-pointer hover:border-white/10 transition-all group"
    >
      {/* Snapshot */}
      <div className="relative aspect-video bg-dark-bg overflow-hidden">
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-card">
            <Camera className="h-12 w-12 text-muted mb-2" />
            <span className="text-sm text-muted">No image available</span>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-card">
                <RefreshCw className="h-6 w-6 text-muted animate-spin" />
              </div>
            )}
            <img
              key={snapshotKey}
              src={`${snapshotUrl}&t=${snapshotKey}`}
              alt={camera.name}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        )}

        {/* Overlay - Top */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{camera.name}</span>
            <div
              className={cn(
                'status-dot',
                camera.status === 'online' ? 'status-dot-online' : 'status-dot-offline'
              )}
            />
          </div>
        </div>

        {/* Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2">
              <Video className="h-3 w-3" />
              <span>{camera.fps} FPS</span>
            </div>
            {lastEvent && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(lastEvent.start_time)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live indicator */}
        {camera.status === 'online' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/90">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-medium text-white">LIVE</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {camera.detection_enabled && (
              <Badge variant="success" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" />
                Detection
              </Badge>
            )}
            {camera.zones.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {camera.zones.length} zone{camera.zones.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {lastEvent && (
            <span className="text-tiny text-muted">
              Last: {formatRelativeTime(lastEvent.start_time)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Camera Card Skeleton
 */
function CameraCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * CamerasSection - Main cameras grid view
 */
export function CamerasSection() {
  const { data: cameras, isLoading, error } = useCameras();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Camera className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load cameras</h3>
        <p className="text-sm text-muted">Please check your Frigate connection.</p>
      </div>
    );
  }

  const onlineCameras = cameras?.filter((c) => c.status === 'online').length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-h2 font-semibold text-white">Cameras</h2>
        <p className="text-sm text-muted mt-1">
          {isLoading
            ? 'Loading...'
            : `${onlineCameras} online of ${cameras?.length || 0} cameras`}
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <CameraCardSkeleton />
              <CameraCardSkeleton />
              <CameraCardSkeleton />
            </div>
          ) : cameras && cameras.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {cameras.map((camera, index) => (
                  <motion.div
                    key={camera.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <CameraCard camera={camera} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-12 w-12 text-muted mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No cameras found</h3>
              <p className="text-sm text-muted">
                Configure cameras in Frigate to see them here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
