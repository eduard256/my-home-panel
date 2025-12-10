import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number | null | undefined, decimals = 2): string {
  if (bytes == null || bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format bytes per second to human readable string
 */
export function formatBytesPerSecond(bytes: number): string {
  return `${formatBytes(bytes)}/s`;
}

/**
 * Format uptime seconds to human readable string
 */
export function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 60) return seconds ? `${seconds}s` : '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Format percentage with fixed decimals
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Format timestamp to time string (HH:mm)
 */
export function formatTime(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp * 1000);
  return format(date, 'HH:mm');
}

/**
 * Format timestamp for grouping (Today, Yesterday, date)
 */
export function formatDateGroup(timestamp: string): string {
  const date = parseISO(timestamp);

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';

  return format(date, 'MMM d');
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage
 */
export function calculatePercent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Downsample data for charts
 */
export function downsampleData(data: number[], targetPoints: number): number[] {
  if (data.length <= targetPoints) return data;

  const result: number[] = [];
  const bucketSize = data.length / targetPoints;

  for (let i = 0; i < targetPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const bucket = data.slice(start, end);
    const avg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    result.push(avg);
  }

  return result;
}

/**
 * Get status color based on health status
 */
export function getStatusColor(status: 'healthy' | 'degraded' | 'offline' | 'online' | 'running' | 'stopped' | 'paused'): string {
  switch (status) {
    case 'healthy':
    case 'online':
    case 'running':
      return '#10b981';
    case 'degraded':
    case 'paused':
      return '#f59e0b';
    case 'offline':
    case 'stopped':
      return '#ef4444';
    default:
      return '#6b6b70';
  }
}

/**
 * Get status class based on status
 */
export function getStatusClass(status: string): string {
  switch (status) {
    case 'healthy':
    case 'online':
    case 'running':
      return 'status-dot-online';
    case 'degraded':
    case 'paused':
      return 'status-dot-warning';
    case 'offline':
    case 'stopped':
      return 'status-dot-offline';
    default:
      return 'bg-muted';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
}

/**
 * Check if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Get time range in milliseconds
 */
export function getTimeRangeMs(range: '1h' | '6h' | '24h' | '7d' | '30d'): number {
  const hour = 3600000;
  const day = hour * 24;

  switch (range) {
    case '1h':
      return hour;
    case '6h':
      return hour * 6;
    case '24h':
      return day;
    case '7d':
      return day * 7;
    case '30d':
      return day * 30;
  }
}

/**
 * Convert Unix timestamp to Date
 */
export function unixToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Storage helpers with error handling
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
};

/**
 * Session storage helpers
 */
export const sessionStorage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Session storage set error:', error);
    }
  },
};
