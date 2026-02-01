/**
 * In-memory cache for MQTT device states.
 *
 * Features:
 * - Deduplication: only reports changes when payload actually differs (JSON string compare)
 * - Topic filtering: ignores system/internal topics that are not useful for the UI
 * - Fast lookups via Map for both individual topics and full cache snapshots
 */

/** Prefixes of MQTT topics to ignore entirely. */
const IGNORED_PREFIXES = [
  'homeassistant/',
  'zigbee2mqtt/bridge/',
];

/** Suffixes of MQTT topics to ignore (commands, not states). */
const IGNORED_SUFFIXES = [
  '/set',
  '/get',
  '/cmd',
];

interface CacheEntry {
  payload: unknown;
  /** JSON.stringify of payload, kept for fast dedup comparison. */
  serialized: string;
  timestamp: string;
}

export class Cache {
  private store = new Map<string, CacheEntry>();

  /**
   * Check whether a topic should be cached.
   * Returns false for system topics and command topics.
   */
  private shouldCache(topic: string): boolean {
    for (const prefix of IGNORED_PREFIXES) {
      if (topic.startsWith(prefix)) return false;
    }
    for (const suffix of IGNORED_SUFFIXES) {
      if (topic.endsWith(suffix)) return false;
    }
    return true;
  }

  /**
   * Update cache for a topic.
   * Returns true if the payload actually changed (or is new), false if identical.
   */
  set(topic: string, payload: unknown): boolean {
    if (!this.shouldCache(topic)) return false;

    const serialized = JSON.stringify(payload);
    const existing = this.store.get(topic);

    // Dedup: skip if payload is identical
    if (existing && existing.serialized === serialized) {
      return false;
    }

    this.store.set(topic, {
      payload,
      serialized,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Get all cached device states as a plain object.
   * Used for the "init" message when a WebSocket client connects.
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [topic, entry] of this.store) {
      result[topic] = entry.payload;
    }
    return result;
  }

  /** Number of cached topics. */
  get size(): number {
    return this.store.size;
  }
}
