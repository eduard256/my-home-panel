/**
 * Environment configuration for the MQTT WebSocket Gateway.
 * All values are read from environment variables with sensible defaults.
 */
export const config = {
  mqtt: {
    broker: process.env.MQTT_BROKER ?? 'localhost',
    port: parseInt(process.env.MQTT_PORT ?? '1883', 10),
    username: process.env.MQTT_USER ?? '',
    password: process.env.MQTT_PASSWORD ?? '',
  },
  ws: {
    host: process.env.WS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.WS_PORT ?? '8082', 10),
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
} as const;
