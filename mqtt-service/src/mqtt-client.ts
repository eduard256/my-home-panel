/**
 * MQTT client wrapper.
 *
 * Connects to the MQTT broker, subscribes to all topics (#),
 * and forwards parsed messages to a callback. Provides a publish method
 * for sending commands back to devices.
 *
 * Uses mqtt.js which handles auto-reconnect natively.
 */

import mqtt from 'mqtt';
import { config } from './config.js';

export type MqttMessageCallback = (topic: string, payload: unknown) => void;

export class MqttClient {
  private client: mqtt.MqttClient | null = null;
  private onMessage: MqttMessageCallback;

  constructor(onMessage: MqttMessageCallback) {
    this.onMessage = onMessage;
  }

  /** Connect to the MQTT broker and start listening. */
  connect(): void {
    const { broker, port, username, password } = config.mqtt;
    const url = `mqtt://${broker}:${port}`;

    console.log(`[MQTT] Connecting to ${url}`);

    this.client = mqtt.connect(url, {
      username: username || undefined,
      password: password || undefined,
      reconnectPeriod: 5000,
      keepalive: 60,
      clean: true,
    });

    this.client.on('connect', () => {
      console.log('[MQTT] Connected to broker');
      // Subscribe to all topics
      this.client!.subscribe('#', { qos: 1 }, (err) => {
        if (err) {
          console.error('[MQTT] Subscribe error:', err.message);
        } else {
          console.log('[MQTT] Subscribed to all topics (#)');
        }
      });
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      try {
        let payload: unknown;
        try {
          payload = JSON.parse(message.toString('utf-8'));
        } catch {
          // Not JSON — store as raw string
          payload = message.toString('utf-8');
        }
        this.onMessage(topic, payload);
      } catch (err) {
        console.error('[MQTT] Error processing message:', err);
      }
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT] Reconnecting...');
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] Error:', err.message);
    });

    this.client.on('close', () => {
      console.log('[MQTT] Connection closed');
    });
  }

  /**
   * Publish a message to an MQTT topic.
   * Returns true if the publish was initiated successfully.
   */
  publish(topic: string, payload: unknown): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.client?.connected) {
        console.error('[MQTT] Cannot publish: not connected');
        resolve(false);
        return;
      }

      const message = typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

      // Timeout: resolve false after 5s to prevent hanging
      const timeout = setTimeout(() => {
        console.error(`[MQTT] Publish timeout on ${topic}`);
        resolve(false);
      }, 5000);

      this.client.publish(topic, message, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        if (err) {
          console.error(`[MQTT] Publish error on ${topic}:`, err.message);
          resolve(false);
        } else {
          console.log(`[MQTT] Published to ${topic}`);
          resolve(true);
        }
      });
    });
  }

  /** Gracefully disconnect from the broker. */
  async shutdown(): Promise<void> {
    if (this.client) {
      console.log('[MQTT] Shutting down');
      await this.client.endAsync();
      this.client = null;
    }
  }
}
