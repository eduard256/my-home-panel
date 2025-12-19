import type {
  ConnectionStatus,
  ConnectionCallback,
  DeviceState,
  MQTTSSEEvent,
  PublishPayload,
  SubscriberCallback,
  UnsubscribeFunction,
} from '@/types/smart-home';
import { useAuthStore } from '@/stores/authStore';

/**
 * Singleton MQTT Manager for Smart Home devices.
 * Maintains a single SSE connection to the MQTT stream endpoint
 * and provides subscription-based state management.
 */
class MQTTManager {
  private static instance: MQTTManager;

  private eventSource: EventSource | null = null;
  private deviceStates: Map<string, DeviceState> = new Map();
  private subscribers: Map<string, Set<SubscriberCallback>> = new Map();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 3000;
  private isManuallyDisconnected = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance of MQTTManager.
   */
  public static getInstance(): MQTTManager {
    if (!MQTTManager.instance) {
      MQTTManager.instance = new MQTTManager();
    }
    return MQTTManager.instance;
  }

  /**
   * Get current connection status.
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Update connection status and notify listeners.
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.connectionListeners.forEach((callback) => callback(status));
  }

  /**
   * Start SSE connection to MQTT stream.
   */
  public connect(): void {
    if (this.eventSource) {
      console.log('[MQTTManager] Already connected or connecting');
      return;
    }

    this.isManuallyDisconnected = false;
    const token = useAuthStore.getState().token;

    if (!token) {
      console.error('[MQTTManager] No auth token available');
      this.setConnectionStatus('error');
      return;
    }

    this.setConnectionStatus('connecting');

    // Load initial state from cache before starting SSE
    this.loadInitialState(token);

    // Create SSE connection with all topics
    const url = `/api/mqtt/stream?topics=*&token=${encodeURIComponent(token)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[MQTTManager] SSE connection established');
      this.setConnectionStatus('connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data: MQTTSSEEvent = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('[MQTTManager] Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('[MQTTManager] SSE connection error:', error);
      this.setConnectionStatus('error');
      this.eventSource?.close();
      this.eventSource = null;

      // Attempt reconnection if not manually disconnected
      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Load initial state from cached topics.
   * Fetches all topics from /api/mqtt/topics and populates deviceStates.
   */
  private async loadInitialState(token: string): Promise<void> {
    try {
      console.log('[MQTTManager] Loading initial state from cache...');

      const response = await fetch('/api/mqtt/topics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[MQTTManager] Failed to load initial state:', response.statusText);
        return;
      }

      const data = await response.json();
      const topics = data.topics || {};

      let loadedCount = 0;
      for (const [topicPath, topicData] of Object.entries(topics)) {
        const payload = (topicData as { payload: DeviceState }).payload;
        if (payload) {
          this.deviceStates.set(topicPath, payload);
          loadedCount++;

          // Notify any existing subscribers immediately
          const topicSubscribers = this.subscribers.get(topicPath);
          if (topicSubscribers) {
            topicSubscribers.forEach((callback) => callback(payload));
          }
        }
      }

      console.log(`[MQTTManager] Loaded ${loadedCount} topics from cache`);
    } catch (error) {
      console.error('[MQTTManager] Error loading initial state:', error);
    }
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    console.log(`[MQTTManager] Scheduling reconnect in ${this.reconnectDelay}ms`);
    this.reconnectTimeout = setTimeout(() => {
      console.log('[MQTTManager] Attempting to reconnect...');
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Close SSE connection.
   */
  public disconnect(): void {
    this.isManuallyDisconnected = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setConnectionStatus('disconnected');
    console.log('[MQTTManager] Disconnected');
  }

  /**
   * Handle incoming MQTT message.
   */
  private handleMessage(data: MQTTSSEEvent): void {
    const { topic, payload } = data;

    console.log('[MQTTManager] Received SSE message:', topic, payload);

    // Store the state
    this.deviceStates.set(topic, payload);

    // Notify subscribers for this specific topic
    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      topicSubscribers.forEach((callback) => callback(payload));
    }

    // Also check for wildcard subscribers (topic patterns)
    this.subscribers.forEach((callbacks, subscribedTopic) => {
      if (subscribedTopic !== topic && this.topicMatches(subscribedTopic, topic)) {
        callbacks.forEach((callback) => callback(payload));
      }
    });
  }

  /**
   * Check if a subscribed topic pattern matches an incoming topic.
   */
  private topicMatches(pattern: string, topic: string): boolean {
    // Simple wildcard matching for MQTT-style topics
    if (pattern === '*' || pattern === '#') {
      return true;
    }

    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') {
        return true; // Multi-level wildcard matches rest
      }
      if (patternParts[i] === '+') {
        continue; // Single-level wildcard matches any single level
      }
      if (patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return patternParts.length === topicParts.length;
  }

  /**
   * Subscribe to state changes for a specific topic.
   */
  public subscribe(topic: string, callback: SubscriberCallback): UnsubscribeFunction {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }

    this.subscribers.get(topic)!.add(callback);

    // Immediately call callback with current state if available
    const currentState = this.deviceStates.get(topic);
    if (currentState) {
      callback(currentState);
    }

    // Return unsubscribe function
    return () => {
      const topicSubscribers = this.subscribers.get(topic);
      if (topicSubscribers) {
        topicSubscribers.delete(callback);
        if (topicSubscribers.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  /**
   * Get current state for a topic.
   */
  public getState(topic: string): DeviceState | null {
    return this.deviceStates.get(topic) ?? null;
  }

  /**
   * Publish a command to a device.
   */
  public async publish(topic: string, payload: PublishPayload): Promise<boolean> {
    const token = useAuthStore.getState().token;

    console.log('[MQTTManager] Publishing to', topic, payload);

    if (!token) {
      console.error('[MQTTManager] No auth token for publish');
      return false;
    }

    try {
      const publishTopic = `${topic}/set`;
      console.log('[MQTTManager] Full topic:', publishTopic);

      const response = await fetch('/api/mqtt/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: publishTopic,
          payload,
        }),
      });

      const responseData = await response.json();
      console.log('[MQTTManager] Publish response:', responseData);

      if (!response.ok) {
        console.error('[MQTTManager] Publish failed:', response.statusText, responseData);
        return false;
      }

      return responseData.success ?? true;
    } catch (error) {
      console.error('[MQTTManager] Publish error:', error);
      return false;
    }
  }

  /**
   * Subscribe to connection status changes.
   */
  public onConnectionChange(callback: ConnectionCallback): UnsubscribeFunction {
    this.connectionListeners.add(callback);

    // Immediately notify of current status
    callback(this.connectionStatus);

    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  /**
   * Check if connected.
   */
  public isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  /**
   * Get all current device states (for debugging/inspection).
   */
  public getAllStates(): Map<string, DeviceState> {
    return new Map(this.deviceStates);
  }
}

// Export singleton instance
export const mqttManager = MQTTManager.getInstance();
export default mqttManager;
