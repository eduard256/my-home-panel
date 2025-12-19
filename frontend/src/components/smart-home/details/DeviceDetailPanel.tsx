import { motion } from 'framer-motion';
import { ArrowLeft, WifiHigh, WifiMedium, WifiLow, WifiSlash, Lightning } from '@phosphor-icons/react';
import { useMQTT } from '@/hooks/useMQTT';
import { getDeviceById, getRoomById } from '@/config/smart-home-devices';
import { SwitchDetail } from './SwitchDetail';
import { DimmerDetail } from './DimmerDetail';
import { CurtainDetail } from './CurtainDetail';
import { SensorDetail } from './SensorDetail';
import type { DeviceConfig, DeviceState, PublishPayload } from '@/types/smart-home';

interface DeviceDetailPanelProps {
  deviceId: string;
  onClose: () => void;
}

/**
 * Get signal quality indicator based on link quality.
 */
function SignalIndicator({ linkQuality }: { linkQuality?: number }) {
  if (!linkQuality) return null;

  const getSignalIcon = () => {
    if (linkQuality > 100) return <WifiHigh size={14} weight="bold" className="text-success" />;
    if (linkQuality > 50) return <WifiMedium size={14} weight="bold" className="text-warning" />;
    return <WifiLow size={14} weight="bold" className="text-destructive" />;
  };

  const getSignalText = () => {
    if (linkQuality > 100) return 'Excellent';
    if (linkQuality > 50) return 'Good';
    return 'Weak';
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      {getSignalIcon()}
      <span>{getSignalText()}</span>
    </div>
  );
}

/**
 * Format last seen time.
 */
function formatLastSeen(lastSeen?: string): string {
  if (!lastSeen) return 'Unknown';

  const date = new Date(lastSeen);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

/**
 * Technical info section component.
 */
function TechnicalInfo({ state }: { state: DeviceState | null }) {
  if (!state) return null;

  const linkQuality = (state as { linkquality?: number }).linkquality;
  const lastSeen = (state as { last_seen?: string }).last_seen;
  const power = (state as { power?: number }).power;
  const voltage = (state as { voltage?: number }).voltage;

  return (
    <div className="mt-6 pt-4 border-t border-white/5">
      <h3 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">
        Technical Info
      </h3>
      <div className="space-y-2">
        {power !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1.5">
              <Lightning size={12} weight="fill" />
              Power
            </span>
            <span className="text-white font-medium">{power}W</span>
          </div>
        )}
        {voltage !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Voltage</span>
            <span className="text-white font-medium">{voltage}V</span>
          </div>
        )}
        {linkQuality !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Link Quality</span>
            <span className="text-white font-medium">{linkQuality}</span>
          </div>
        )}
        {lastSeen && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Last Seen</span>
            <span className="text-white font-medium">{formatLastSeen(lastSeen)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Render device-specific controls based on type.
 */
function DeviceControls({
  device,
  state,
  isConnected,
  onPublish,
}: {
  device: DeviceConfig;
  state: DeviceState | null;
  isConnected: boolean;
  onPublish: (payload: PublishPayload) => Promise<boolean>;
}) {
  switch (device.type) {
    case 'switch':
    case 'relay':
    case 'plug':
      return (
        <SwitchDetail
          device={device}
          state={state}
          isConnected={isConnected}
          onPublish={onPublish}
        />
      );
    case 'dimmer':
      return (
        <DimmerDetail
          device={device}
          state={state}
          isConnected={isConnected}
          onPublish={onPublish}
        />
      );
    case 'curtain':
      return (
        <CurtainDetail
          device={device}
          state={state}
          isConnected={isConnected}
          onPublish={onPublish}
        />
      );
    case 'button':
    case 'motion_sensor':
    case 'contact_sensor':
      return (
        <SensorDetail
          device={device}
          state={state}
        />
      );
    case 'rgb_light':
    case 'led_strip':
      // For now, use switch detail for these
      return (
        <SwitchDetail
          device={device}
          state={state}
          isConnected={isConnected}
          onPublish={onPublish}
        />
      );
    default:
      return (
        <div className="text-center text-muted py-8">
          <p>No controls available for this device type</p>
        </div>
      );
  }
}

/**
 * Device detail panel component for Block 3.
 */
export function DeviceDetailPanel({ deviceId, onClose }: DeviceDetailPanelProps) {
  const device = getDeviceById(deviceId);
  const room = device ? getRoomById(device.roomId) : undefined;
  const { state, publish, isConnected } = useMQTT(device?.topic || '');

  if (!device) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">Device not found</p>
      </div>
    );
  }

  const linkQuality = (state as { linkquality?: number })?.linkquality;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={18} weight="bold" />
          <span className="text-sm">Back</span>
        </button>
        <SignalIndicator linkQuality={linkQuality} />
      </div>

      {/* Device info */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">{device.name}</h2>
        <p className="text-sm text-muted">{room?.displayName || 'Unknown Room'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {device.isOffline ? (
            <>
              <WifiSlash size={14} className="text-destructive" />
              <span className="text-xs text-destructive">Offline</span>
            </>
          ) : isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success">Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-xs text-warning">Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Control area */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
          <DeviceControls
            device={device}
            state={state}
            isConnected={isConnected}
            onPublish={publish}
          />
        </div>

        {/* Technical info */}
        <TechnicalInfo state={state} />
      </div>
    </motion.div>
  );
}

export default DeviceDetailPanel;
