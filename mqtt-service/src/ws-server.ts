/**
 * WebSocket server with client hub for broadcasting MQTT updates.
 *
 * On new connection:
 *   1. Immediately sends full cache as {type: "init", devices: {...}}
 *   2. Adds client to broadcast set
 *
 * On incoming client message:
 *   - Handles "publish" type: forwards to MQTT and responds with result
 *
 * Broadcast:
 *   - All state updates are sent to every connected client
 *
 * Health:
 *   - Ping/pong every 30s to detect dead connections
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Cache } from './cache.js';
import type { ServerMessage, PublishMessage } from './protocol.js';

export type PublishHandler = (topic: string, payload: unknown) => Promise<boolean>;

interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
}

export class WsServer {
  private wss: WebSocketServer;
  private clients = new Set<AliveWebSocket>();
  private cache: Cache;
  private onPublish: PublishHandler;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(host: string, port: number, cache: Cache, onPublish: PublishHandler) {
    this.cache = cache;
    this.onPublish = onPublish;

    this.wss = new WebSocketServer({ host, port });

    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as AliveWebSocket;
      client.isAlive = true;
      this.clients.add(client);

      console.log(`[WS] Client connected (total: ${this.clients.size})`);

      // Send full cache immediately on connect
      const initMsg: ServerMessage = {
        type: 'init',
        devices: this.cache.getAll(),
      };
      client.send(JSON.stringify(initMsg));

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('message', (data) => {
        this.handleClientMessage(client, data);
      });

      client.on('close', () => {
        this.clients.delete(client);
        console.log(`[WS] Client disconnected (total: ${this.clients.size})`);
      });

      client.on('error', (err) => {
        console.error('[WS] Client error:', err.message);
        this.clients.delete(client);
      });
    });

    // Ping/pong interval to detect dead connections
    this.pingInterval = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          console.log('[WS] Terminating dead client');
          client.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ping();
      }
    }, 30_000);

    console.log(`[WS] Server listening on ${host}:${port}`);
  }

  /** Handle incoming message from a WebSocket client. */
  private async handleClientMessage(client: AliveWebSocket, data: unknown): Promise<void> {
    try {
      const raw = typeof data === 'string' ? data : (data as Buffer).toString('utf-8');
      const msg = JSON.parse(raw) as { type: string };

      if (msg.type === 'publish') {
        const pubMsg = msg as unknown as PublishMessage;
        if (!pubMsg.topic || pubMsg.payload === undefined) {
          client.send(JSON.stringify({
            type: 'publish_result',
            success: false,
            topic: pubMsg.topic ?? '',
            error: 'Missing topic or payload',
          }));
          return;
        }

        const success = await this.onPublish(pubMsg.topic, pubMsg.payload);
        client.send(JSON.stringify({
          type: 'publish_result',
          success,
          topic: pubMsg.topic,
        }));
      }
    } catch (err) {
      console.error('[WS] Failed to handle client message:', err);
    }
  }

  /** Broadcast a message to all connected clients. */
  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /** Number of connected clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Gracefully shut down the WebSocket server. */
  async shutdown(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    for (const client of this.clients) {
      client.close(1001, 'Server shutting down');
    }
    this.clients.clear();

    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('[WS] Server closed');
        resolve();
      });
    });
  }
}
