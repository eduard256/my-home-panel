import { motion } from 'framer-motion';
import { WifiHigh, WifiSlash, Spinner } from '@phosphor-icons/react';
import { useSmartHomeConnection } from '@/hooks/useSmartHomeWS';
import { getSortedRooms, getDevicesByRoom } from '@/config/smart-home-new-devices';
import { RoomSection } from './RoomSection';

/**
 * Connection status indicator component.
 */
function ConnectionStatus({
  status,
  onReconnect,
}: {
  status: string;
  onReconnect: () => void;
}) {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="flex items-center gap-2">
      {isConnecting ? (
        <>
          <Spinner size={16} className="animate-spin text-muted" />
          <span className="text-xs text-muted">Connecting...</span>
        </>
      ) : isConnected ? (
        <>
          <WifiHigh size={16} weight="bold" className="text-success" />
          <span className="text-xs text-success">Live</span>
        </>
      ) : (
        <>
          <WifiSlash size={16} weight="bold" className="text-destructive" />
          <span className="text-xs text-destructive">Disconnected</span>
          <button
            onClick={onReconnect}
            className="ml-2 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
          >
            Reconnect
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Main Smart Home New section component.
 * Manages WebSocket connection and renders all room sections.
 */
export function SmartHomeNewSection() {
  const { connectionStatus, reconnect } = useSmartHomeConnection();
  const rooms = getSortedRooms();

  return (
    <div className="h-full flex flex-col">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-white/5 flex items-center justify-between"
      >
        <div>
          <h2 className="text-h2 font-semibold text-white">Smart Home New</h2>
          <p className="text-sm text-muted mt-1">Control your devices</p>
        </div>
        <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
      </motion.div>

      {/* Rooms masonry layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <style>{`
            .masonry-container-new {
              column-count: 1;
              column-gap: 1.5rem;
            }
            @media (min-width: 768px) {
              .masonry-container-new { column-count: 2; }
            }
            @media (min-width: 1280px) {
              .masonry-container-new { column-count: 3; }
            }
          `}</style>
          <div className="masonry-container-new">
            {rooms.map((room) => {
              const devices = getDevicesByRoom(room.id);
              return (
                <RoomSection
                  key={room.id}
                  room={room}
                  devices={devices}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
