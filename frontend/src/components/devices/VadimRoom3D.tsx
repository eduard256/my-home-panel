import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import type { Device } from '@/types';
import { useDeviceControl } from '@/hooks';
import { cn } from '@/lib/utils';
import { ChevronUp, Lightbulb } from 'lucide-react';

interface VadimRoom3DProps {
  devices: Device[];
}

/**
 * Room dimensions (in meters)
 */
const ROOM = {
  width: 5,
  depth: 6,
  height: 2.7,
};

/**
 * Interactive Light Point
 */
function LightPoint({
  position,
  isOn,
  color,
  onClick,
  label,
}: {
  position: [number, number, number];
  isOn: boolean;
  color: string;
  onClick: () => void;
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && isOn) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  return (
    <group position={position}>
      {/* Light glow */}
      {isOn && (
        <pointLight
          intensity={2}
          distance={3}
          color={color}
          castShadow
        />
      )}

      {/* Interactive sphere */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={isOn ? color : '#666'}
          emissive={isOn ? color : '#000'}
          emissiveIntensity={isOn ? 0.8 : 0}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Label */}
      {hovered && (
        <Html center distanceFactor={10}>
          <div className="pointer-events-none bg-black/90 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap backdrop-blur-sm">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * LED Strip visualization
 */
function LEDStrip({
  device,
  position,
  width,
  depth,
}: {
  device: Device;
  position: [number, number, number];
  width: number;
  depth: number;
}) {
  const isOn = device.state?.state === 'ON';
  const color = device.state?.color || { r: 255, g: 220, b: 180 };
  const brightness = (device.state?.brightness || 100) / 100;

  const rgbColor = useMemo(
    () => new THREE.Color(`rgb(${color.r}, ${color.g}, ${color.b})`),
    [color.r, color.g, color.b]
  );

  if (!isOn) return null;

  // Create LED strip segments around bed perimeter
  const segments = [
    { pos: [0, 0, depth / 2], rot: [0, 0, 0], len: width }, // front
    { pos: [0, 0, -depth / 2], rot: [0, 0, 0], len: width }, // back
    { pos: [width / 2, 0, 0], rot: [0, Math.PI / 2, 0], len: depth }, // right
    { pos: [-width / 2, 0, 0], rot: [0, Math.PI / 2, 0], len: depth }, // left
  ];

  return (
    <group position={position}>
      {segments.map((seg, i) => (
        <group key={i} position={seg.pos as [number, number, number]} rotation={seg.rot as [number, number, number]}>
          <mesh>
            <boxGeometry args={[seg.len, 0.02, 0.02]} />
            <meshStandardMaterial
              color={rgbColor}
              emissive={rgbColor}
              emissiveIntensity={brightness * 2}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
          <pointLight
            intensity={brightness * 1.5}
            distance={1.5}
            color={rgbColor}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}

/**
 * Curtain visualization
 */
function Curtain({ device }: { device: Device }) {
  const position = device.state?.position ?? 0;
  const curtainHeight = (100 - position) / 100;

  return (
    <group position={[ROOM.width / 2 - 0.05, ROOM.height / 2, 0]}>
      <mesh position={[0, -ROOM.height / 2 * (1 - curtainHeight), 0]}>
        <boxGeometry args={[0.05, ROOM.height * curtainHeight, 2]} />
        <meshStandardMaterial
          color="#3730a3"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

/**
 * Room Scene
 */
function RoomScene({ devices }: { devices: Device[] }) {
  const dualSwitch = devices.find(d => d.type === 'dual-switch');
  const rgbStrip = devices.find(d => d.type === 'rgb-strip');
  const curtain = devices.find(d => d.type === 'curtain');

  const { setPayload: setDualPayload } = useDeviceControl(dualSwitch!);

  const leftOn = dualSwitch?.state?.state_left === 'ON';
  const rightOn = dualSwitch?.state?.state_right === 'ON';

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.3} />

      {/* Main directional light */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Walls */}
      {/* Back wall */}
      <mesh position={[0, ROOM.height / 2, -ROOM.depth / 2]} receiveShadow>
        <boxGeometry args={[ROOM.width, ROOM.height, 0.1]} />
        <meshStandardMaterial color="#252525" roughness={0.8} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-ROOM.width / 2, ROOM.height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.1, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#252525" roughness={0.8} />
      </mesh>

      {/* Right wall with window */}
      <group position={[ROOM.width / 2, ROOM.height / 2, 0]}>
        {/* Window frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, ROOM.height - 0.4, 2.2]} />
          <meshStandardMaterial color="#8b7355" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Glass */}
        <mesh position={[-0.02, 0, 0]}>
          <boxGeometry args={[0.02, ROOM.height - 0.5, 2]} />
          <meshPhysicalMaterial
            color="#87ceeb"
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0}
            transmission={0.9}
          />
        </mesh>
      </group>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.height, 0]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>

      {/* Wardrobe (left side) */}
      <mesh position={[-ROOM.width / 2 + 0.4, 1, -ROOM.depth / 4]} castShadow>
        <boxGeometry args={[0.7, 2, 1.5]} />
        <meshStandardMaterial color="#4a3728" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Bed */}
      <group position={[0, 0.3, -ROOM.depth / 4]}>
        {/* Bed frame */}
        <mesh castShadow>
          <boxGeometry args={[2, 0.6, 1.8]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
        </mesh>
        {/* Mattress */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[1.9, 0.2, 1.7]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>

        {/* LED Strip */}
        {rgbStrip && <LEDStrip device={rgbStrip} position={[0, -0.2, 0]} width={2} depth={1.8} />}
      </group>

      {/* Desk (right side) */}
      <mesh position={[ROOM.width / 2 - 0.8, 0.4, 0.5]} castShadow>
        <boxGeometry args={[0.6, 0.8, 2]} />
        <meshStandardMaterial color="#3d2f1f" roughness={0.7} />
      </mesh>

      {/* Side Light (ceiling mounted, right area) */}
      {dualSwitch && (
        <LightPoint
          position={[ROOM.width / 2 - 1.2, ROOM.height - 0.1, 0.5]}
          isOn={leftOn}
          color="#ffd89b"
          onClick={() => setDualPayload({ state_left: leftOn ? 'OFF' : 'ON' })}
          label="Side Light"
        />
      )}

      {/* Chandelier (ceiling mounted, above bed) */}
      {dualSwitch && (
        <LightPoint
          position={[0, ROOM.height - 0.1, -ROOM.depth / 4]}
          isOn={rightOn}
          color="#ffe4b5"
          onClick={() => setDualPayload({ state_right: rightOn ? 'OFF' : 'ON' })}
          label="Chandelier"
        />
      )}

      {/* Curtain */}
      {curtain && <Curtain device={curtain} />}

      {/* Door frame (entrance) */}
      <mesh position={[-ROOM.width / 2 + 0.05, 1, ROOM.depth / 2 - 1]} castShadow>
        <boxGeometry args={[0.1, 2, 0.9]} />
        <meshStandardMaterial color="#3d2f1f" roughness={0.6} />
      </mesh>
    </>
  );
}

/**
 * Control Panel Overlay
 */
function ControlPanel({ devices }: { devices: Device[] }) {
  const dualSwitch = devices.find(d => d.type === 'dual-switch');
  const rgbStrip = devices.find(d => d.type === 'rgb-strip');
  const curtain = devices.find(d => d.type === 'curtain');

  const { setPayload: setDualPayload } = useDeviceControl(dualSwitch!);
  const { setPayload: setRGBPayload } = useDeviceControl(rgbStrip!);
  const { setPayload: setCurtainPayload } = useDeviceControl(curtain!);

  const leftOn = dualSwitch?.state?.state_left === 'ON';
  const rightOn = dualSwitch?.state?.state_right === 'ON';
  const stripOn = rgbStrip?.state?.state === 'ON';
  const curtainPos = curtain?.state?.position ?? 0;

  return (
    <div className="absolute top-4 right-4 space-y-3 z-10">
      {/* Lights */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 min-w-[200px]"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Lighting
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => setDualPayload({ state_left: leftOn ? 'OFF' : 'ON' })}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-xs font-medium transition-all',
              leftOn ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            Side Light
          </button>
          <button
            onClick={() => setDualPayload({ state_right: rightOn ? 'OFF' : 'ON' })}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-xs font-medium transition-all',
              rightOn ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            Chandelier
          </button>
          <button
            onClick={() => setRGBPayload({ state: stripOn ? 'OFF' : 'ON' })}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-xs font-medium transition-all',
              stripOn ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            LED Strip
          </button>
        </div>
      </motion.div>

      {/* Curtain */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 min-w-[200px]"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <ChevronUp className="h-4 w-4" />
          Window
        </h3>
        <div className="space-y-2">
          <div className="text-center text-xs text-white mb-2">{curtainPos}% Open</div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurtainPayload({ position: 100 })}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Open
            </button>
            <button
              onClick={() => setCurtainPayload({ position: 0 })}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Main 3D Room Component
 */
export function VadimRoom3D({ devices }: VadimRoom3DProps) {
  return (
    <div className="relative w-full h-[600px] bg-gradient-to-b from-black/50 to-black/20 rounded-2xl overflow-hidden border border-white/10">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={50} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={4}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />
        <RoomScene devices={devices} />
      </Canvas>

      <ControlPanel devices={devices} />

      {/* Info text */}
      <div className="absolute bottom-4 left-4 text-xs text-white/60 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
        Click lights to toggle • Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
