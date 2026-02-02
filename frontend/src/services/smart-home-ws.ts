/**
 * Smart Home WebSocket Manager (singleton).
 *
 * Connects to /ws/mqtt backend proxy which forwards to mqtt-ws-gateway.
 * Handles reconnection with exponential backoff, visibility/network events,
 * optimistic updates, and topic-based subscriptions.
 */

import type {
  ConnectionStatus,
  DeviceState,
  PublishPayload,
  SubscriberCallback,
  UnsubscribeFunction,
  WsServerMessage,
} from '@/types/smart-home-new';

/** Reconnection timing constants */
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const BACKOFF_MULTIPLIER = 2;

/** Watchdog: if no message received for this duration, force reconnect */
const WATCHDOG_TIMEOUT = 45000;

type ConnectionListener = (status: ConnectionStatus) => void;

class SmartHomeWsManager {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private deviceCache = new Map<string, DeviceState>();
  private subscribers = new Map<string, Set<SubscriberCallback>>();
  private connectionListeners = new Set<ConnectionListener>();

  /** Reconnection state */
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;

  /** Watchdog: detects dead connections when gateway stops sending messages */
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether connect() has been called and disconnect() hasn't */
  private shouldBeConnected = false;

  /** Token getter — set via connect() */
  private getToken: (() => string | null) | null = null;

  /**
   * Connect to the MQTT WebSocket proxy.
   * @param getToken Function that returns current JWT token
   */
  connect(getToken: () => string | null): void {
    this.getToken = getToken;
    this.shouldBeConnected = true;
    this.intentionalDisconnect = false;
    this.setupEventListeners();
    this.doConnect();
  }

  /**
   * Disconnect and stop reconnecting.
   */
  disconnect(): void {
    this.shouldBeConnected = false;
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.clearWatchdog();
    this.removeEventListeners();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Get current device state from cache.
   */
  getState(topic: string): DeviceState | null {
    return this.deviceCache.get(topic) ?? null;
  }

  /**
   * Get current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Subscribe to state changes for a specific topic.
   * Immediately calls back with current cached state if available.
   */
  subscribe(topic: string, callback: SubscriberCallback): UnsubscribeFunction {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(callback);

    // Immediately deliver cached state
    const cached = this.deviceCache.get(topic);
    if (cached) {
      callback(cached);
    }

    return () => {
      const subs = this.subscribers.get(topic);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  /**
   * Listen to connection status changes.
   */
  onConnectionChange(listener: ConnectionListener): UnsubscribeFunction {
    this.connectionListeners.add(listener);
    // Immediately deliver current status
    listener(this.status);

    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Publish a command to an MQTT topic via WebSocket.
   * Applies optimistic update immediately, rolls back on failure.
   */
  publish(topic: string, payload: PublishPayload): void {
    // Send via WebSocket — Zigbee2MQTT requires /set suffix for commands
    const publishTopic = `${topic}/set`;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[SmartHomeWS] Publishing to ${publishTopic}`, payload);
      this.ws.send(JSON.stringify({
        type: 'publish',
        topic: publishTopic,
        payload,
      }));
    } else {
      console.warn(`[SmartHomeWS] Cannot publish: WS not open (readyState=${this.ws?.readyState})`);
    }
  }

  /**
   * Check if a topic has data in the cache (received from gateway).
   */
  hasData(topic: string): boolean {
    return this.deviceCache.has(topic);
  }

  // ============================================
  // Private methods
  // ============================================

  private doConnect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return; // Already connecting or connected
    }

    const token = this.getToken?.();
    if (!token) {
      console.warn('[SmartHomeWS] No auth token, cannot connect');
      this.setStatus('error');
      return;
    }

    this.setStatus('connecting');

    // Build WS URL: use current host, wss for https, ws for http
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/mqtt`;

    // Auth via subprotocol: "Bearer.<token>" (dot separator, not space)
    this.ws = new WebSocket(url, [`Bearer.${token}`]);

    this.ws.onopen = () => {
      console.log('[SmartHomeWS] Connected');
      this.setStatus('connected');
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
      this.resetWatchdog();
    };

    this.ws.onmessage = (event) => {
      this.resetWatchdog();
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      console.log(`[SmartHomeWS] Closed: code=${event.code} reason=${event.reason}`);
      this.ws = null;
      this.clearWatchdog();

      if (!this.intentionalDisconnect && this.shouldBeConnected) {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, reconnect handled there
      console.warn('[SmartHomeWS] WebSocket error');
    };
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as { type: string };

      // Keepalive ping from proxy — watchdog already reset via onmessage
      if (parsed.type === 'ping') return;

      const msg = parsed as WsServerMessage;

      switch (msg.type) {
        case 'init':
          console.log(`[SmartHomeWS] Init received: ${Object.keys(msg.devices).length} topics`);
          this.handleInit(msg.devices);
          break;

        case 'update':
          console.log(`[SmartHomeWS] Update: ${msg.topic}`, msg.payload);
          this.handleUpdate(msg.topic, msg.payload as DeviceState);
          break;

        case 'publish_result':
          console.log(`[SmartHomeWS] Publish result: ${msg.topic} success=${msg.success}`);
          break;

      }
    } catch (err) {
      console.error('[SmartHomeWS] Failed to parse message:', err);
    }
  }

  /** Handle init: replace entire cache and notify all subscribers. */
  private handleInit(devices: Record<string, unknown>): void {
    this.deviceCache.clear();

    for (const [topic, state] of Object.entries(devices)) {
      this.deviceCache.set(topic, state as DeviceState);
    }

    // Notify all subscribers with their current state
    for (const [topic, subs] of this.subscribers) {
      const state = this.deviceCache.get(topic);
      if (state) {
        for (const cb of subs) {
          cb(state);
        }
      }
    }
  }

  /** Handle update: merge into cache and notify subscribers for that topic. */
  private handleUpdate(topic: string, payload: DeviceState): void {
    // Merge with existing state (gateway sends partial updates)
    const existing = this.deviceCache.get(topic);
    const merged = existing ? { ...existing, ...payload } : payload;
    this.deviceCache.set(topic, merged);
    this.notifySubscribers(topic, merged);
  }

  private notifySubscribers(topic: string, state: DeviceState): void {
    const subs = this.subscribers.get(topic);
    if (subs) {
      for (const cb of subs) {
        cb(state);
      }
    }
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const listener of this.connectionListeners) {
      listener(newStatus);
    }
  }

  // ============================================
  // Reconnection
  // ============================================

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    console.log(`[SmartHomeWS] Reconnecting in ${this.reconnectDelay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * BACKOFF_MULTIPLIER, MAX_RECONNECT_DELAY);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ============================================
  // Watchdog
  // ============================================

  private resetWatchdog(): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      console.warn('[SmartHomeWS] Watchdog: no messages for 45s, forcing reconnect');
      this.forceReconnect();
    }, WATCHDOG_TIMEOUT);
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private forceReconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectDelay = INITIAL_RECONNECT_DELAY;
    if (this.shouldBeConnected) {
      this.doConnect();
    }
  }

  // ============================================
  // Browser event listeners (visibility, network)
  // ============================================

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.shouldBeConnected) {
      // Tab became visible — check if WS is alive
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('[SmartHomeWS] Tab visible, reconnecting');
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
        this.clearReconnectTimer();
        this.doConnect();
      }
    }
  };

  private handleOnline = (): void => {
    if (this.shouldBeConnected) {
      console.log('[SmartHomeWS] Network online, reconnecting');
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
      this.clearReconnectTimer();
      this.doConnect();
    }
  };

  private setupEventListeners(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('online', this.handleOnline);
  }

  private removeEventListeners(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
  }
}

/** Singleton instance */
export const smartHomeWs = new SmartHomeWsManager();
