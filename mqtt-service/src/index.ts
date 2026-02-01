/**
 * MQTT WebSocket Gateway — Entrypoint.
 *
 * Connects to an MQTT broker, caches all device states in memory,
 * and serves WebSocket clients with:
 *   - Full state snapshot on connect
 *   - Real-time updates on state changes
 *   - Bidirectional publish support
 */

import { config } from './config.js';
import { Cache } from './cache.js';
import { MqttClient } from './mqtt-client.js';
import { WsServer } from './ws-server.js';
import type { UpdateMessage } from './protocol.js';

const cache = new Cache();

// MQTT client: on every message, update cache and broadcast if changed
const mqttClient = new MqttClient((topic, payload) => {
  const changed = cache.set(topic, payload);
  if (changed) {
    const msg: UpdateMessage = { type: 'update', topic, payload };
    wsServer.broadcast(msg);
  }
});

// WS server: publish requests go through MQTT client
const wsServer = new WsServer(
  config.ws.port,
  cache,
  (topic, payload) => mqttClient.publish(topic, payload),
);

// Start MQTT connection
mqttClient.connect();

console.log(`[Gateway] MQTT WebSocket Gateway started`);
console.log(`[Gateway] MQTT: ${config.mqtt.broker}:${config.mqtt.port}`);
console.log(`[Gateway] WS:   port ${config.ws.port}`);
console.log(`[Gateway] Cache will populate from MQTT retain messages`);

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Gateway] Received ${signal}, shutting down...`);
  await wsServer.shutdown();
  await mqttClient.shutdown();
  console.log('[Gateway] Goodbye');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
