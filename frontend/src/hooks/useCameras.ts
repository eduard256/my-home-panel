import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import type { Camera, CameraEvent, CameraDetail } from '@/types';

/**
 * Fetch all cameras
 */
export function useCameras() {
  return useQuery<Camera[]>({
    queryKey: ['cameras'],
    queryFn: async () => {
      const response = await api.get(endpoints.cameras.list);
      return response.data;
    },
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Fetch single camera detail
 */
export function useCamera(name: string) {
  return useQuery<CameraDetail>({
    queryKey: ['camera', name],
    queryFn: async () => {
      const response = await api.get(endpoints.cameras.detail(name));
      return response.data;
    },
    enabled: !!name,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Fetch camera events
 */
export function useCameraEvents(
  cameraName?: string,
  options?: {
    limit?: number;
    hasSnapshot?: boolean;
    after?: number;
    before?: number;
    label?: string;
  }
) {
  return useQuery<CameraEvent[]>({
    queryKey: ['camera-events', cameraName, options],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        limit: options?.limit || 20,
      };

      if (cameraName) params.camera = cameraName;
      if (options?.hasSnapshot !== undefined) params.has_snapshot = options.hasSnapshot;
      if (options?.after) params.after = options.after;
      if (options?.before) params.before = options.before;
      if (options?.label) params.label = options.label;

      const response = await api.get(endpoints.cameras.events, { params });
      return response.data;
    },
    staleTime: 0,
    refetchInterval: 3000, // Poll every 3 seconds for events
  });
}

/**
 * Get camera snapshot URL
 */
export function getCameraSnapshotUrl(cameraName: string, quality = 70): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('auth_token');
  const parsedToken = token ? JSON.parse(token) : null;

  return `${baseUrl}${endpoints.cameras.snapshot(cameraName, quality)}&token=${parsedToken?.state?.token || ''}`;
}

/**
 * Get event snapshot URL
 */
export function getEventSnapshotUrl(eventId: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('auth_token');
  const parsedToken = token ? JSON.parse(token) : null;

  return `${baseUrl}${endpoints.cameras.eventSnapshot(eventId)}?token=${parsedToken?.state?.token || ''}`;
}
