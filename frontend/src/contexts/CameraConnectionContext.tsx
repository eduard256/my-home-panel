import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface CameraConnectionContextValue {
  requestConnection: (cameraId: string, onConnect: () => void) => void;
  releaseConnection: (cameraId: string) => void;
}

const CameraConnectionContext = createContext<CameraConnectionContextValue | null>(null);

const MAX_CONCURRENT = 6;
const CONNECTION_DELAY = 400; // ms between connections

export function CameraConnectionProvider({ children }: { children: ReactNode }) {
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const queueRef = useRef<Array<{ cameraId: string; onConnect: () => void }>>([]);
  const processingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;

    processingRef.current = true;

    const process = () => {
      setActiveConnections(current => {
        const newActive = new Set(current);

        // Connect cameras up to limit
        while (queueRef.current.length > 0 && newActive.size < MAX_CONCURRENT) {
          const item = queueRef.current.shift();
          if (!item) break;

          // Skip if already connected
          if (newActive.has(item.cameraId)) continue;

          console.log(`[CameraConnection] Starting ${item.cameraId} (${newActive.size + 1}/${MAX_CONCURRENT})`);

          newActive.add(item.cameraId);

          // Call connect with delay
          setTimeout(() => {
            item.onConnect();
          }, 100);
        }

        return newActive;
      });

      // Schedule next batch if queue not empty
      if (queueRef.current.length > 0) {
        setTimeout(() => {
          processingRef.current = false;
          processQueue();
        }, CONNECTION_DELAY);
      } else {
        processingRef.current = false;
      }
    };

    process();
  }, []);

  const requestConnection = useCallback((cameraId: string, onConnect: () => void) => {
    // Check if already in queue or connected
    if (activeConnections.has(cameraId)) {
      console.log(`[CameraConnection] ${cameraId} already connected`);
      return;
    }

    if (queueRef.current.find(item => item.cameraId === cameraId)) {
      console.log(`[CameraConnection] ${cameraId} already in queue`);
      return;
    }

    console.log(`[CameraConnection] Adding ${cameraId} to queue`);
    queueRef.current.push({ cameraId, onConnect });
    processQueue();
  }, [activeConnections, processQueue]);

  const releaseConnection = useCallback((cameraId: string) => {
    console.log(`[CameraConnection] Releasing ${cameraId}`);
    setActiveConnections(current => {
      const newActive = new Set(current);
      newActive.delete(cameraId);
      return newActive;
    });

    // Process queue to connect next camera
    setTimeout(() => {
      processingRef.current = false;
      processQueue();
    }, CONNECTION_DELAY);
  }, [processQueue]);

  return (
    <CameraConnectionContext.Provider value={{ requestConnection, releaseConnection }}>
      {children}
    </CameraConnectionContext.Provider>
  );
}

export function useCameraConnection() {
  const context = useContext(CameraConnectionContext);
  if (!context) {
    throw new Error('useCameraConnection must be used within CameraConnectionProvider');
  }
  return context;
}
