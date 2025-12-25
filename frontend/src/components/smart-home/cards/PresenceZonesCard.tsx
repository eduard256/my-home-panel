import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UserFocus } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import { mqttManager } from '@/services/mqtt-manager';
import type { DeviceConfig, PresenceZoneState } from '@/types/smart-home';

/** Debounce delay for turning off zone indicators (ms) */
const OCCUPANCY_OFF_DELAY = 2000;

interface PresenceZonesCardProps {
  device: DeviceConfig;
  isConnected: boolean;
  onDetailOpen: () => void;
}

interface ZoneState {
  id: string;
  name: string;
  occupancy: boolean;
}

/**
 * Individual zone cell component displaying occupancy status.
 */
function ZoneCell({ name, occupancy }: { name: string; occupancy: boolean }) {
  return (
    <motion.div
      animate={{
        backgroundColor: occupancy ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
        borderColor: occupancy ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.08)',
      }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center p-2 rounded-lg border text-center min-h-[40px]"
    >
      <div className="flex flex-col items-center gap-0.5">
        <motion.div
          animate={{
            scale: occupancy ? [1, 1.2, 1] : 1,
            opacity: occupancy ? 1 : 0.4,
          }}
          transition={{ duration: 0.3 }}
          className={`w-2 h-2 rounded-full ${occupancy ? 'bg-primary' : 'bg-white/30'}`}
        />
        <span className={`text-[10px] font-medium ${occupancy ? 'text-white' : 'text-muted'}`}>
          {name}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Presence Zones card for Aqara FP2 with 4-zone room map layout.
 * Layout:
 * ┌─────────┬─────────┐
 * │   Bed   │ Entrance│
 * ├─────────┼─────────┤
 * │  Desk   │ Wardrobe│
 * └─────────┴─────────┘
 */
export function PresenceZonesCard({
  device,
  isConnected,
  onDetailOpen,
}: PresenceZonesCardProps) {
  const [zones, setZones] = useState<ZoneState[]>([]);
  const offTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Subscribe to all presence zone topics
  useEffect(() => {
    if (!device.presenceZones || device.presenceZones.length === 0) {
      return;
    }

    // Initialize zones state
    const initialZones = device.presenceZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      occupancy: false,
    }));
    setZones(initialZones);

    // Subscribe to each zone topic with debounced off state
    const unsubscribes = device.presenceZones.map((zone, index) => {
      return mqttManager.subscribe(zone.topic, (state) => {
        const presenceState = state as PresenceZoneState;
        const newOccupancy = presenceState.occupancy ?? false;

        // Clear any existing off timer for this zone
        const existingTimer = offTimersRef.current.get(index);
        if (existingTimer) {
          clearTimeout(existingTimer);
          offTimersRef.current.delete(index);
        }

        if (newOccupancy) {
          // Turn on immediately
          setZones((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index] = { ...updated[index], occupancy: true };
            }
            return updated;
          });
        } else {
          // Debounce turning off - wait 2 seconds before turning off
          const timer = setTimeout(() => {
            setZones((prev) => {
              const updated = [...prev];
              if (updated[index]) {
                updated[index] = { ...updated[index], occupancy: false };
              }
              return updated;
            });
            offTimersRef.current.delete(index);
          }, OCCUPANCY_OFF_DELAY);
          offTimersRef.current.set(index, timer);
        }
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
      // Clear all pending timers on unmount
      offTimersRef.current.forEach((timer) => clearTimeout(timer));
      offTimersRef.current.clear();
    };
  }, [device.presenceZones]);

  // Check if any zone is occupied
  const isAnyOccupied = zones.some((z) => z.occupancy);

  // Get zone by name for layout positioning
  const getZone = (name: string): ZoneState | undefined => {
    return zones.find((z) => z.name.toLowerCase() === name.toLowerCase());
  };

  const bedZone = getZone('Bed');
  const entranceZone = getZone('Entrance');
  const deskZone = getZone('Desk');
  const wardrobeZone = getZone('Wardrobe');

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isAnyOccupied}
      isOffline={!isConnected}
      icon={<UserFocus size={20} weight="fill" />}
      onDetailOpen={onDetailOpen}
    >
      {/* 2x2 Grid Room Map */}
      <div className="grid grid-cols-2 gap-1.5 mt-1">
        {/* Top row: Bed | Entrance */}
        <ZoneCell
          name={bedZone?.name ?? 'Bed'}
          occupancy={bedZone?.occupancy ?? false}
        />
        <ZoneCell
          name={entranceZone?.name ?? 'Entrance'}
          occupancy={entranceZone?.occupancy ?? false}
        />
        {/* Bottom row: Desk | Wardrobe */}
        <ZoneCell
          name={deskZone?.name ?? 'Desk'}
          occupancy={deskZone?.occupancy ?? false}
        />
        <ZoneCell
          name={wardrobeZone?.name ?? 'Wardrobe'}
          occupancy={wardrobeZone?.occupancy ?? false}
        />
      </div>
    </DeviceCard>
  );
}

export default PresenceZonesCard;
