# MQTT API - Complete Usage Guide

Complete documentation for working with MQTT API Gateway for smart home control.

**Base URL:** `http://10.0.20.102:8081/api/v1`
**Authentication:** HTTP Basic Auth (admin:test)
**Format:** JSON

---

## Table of Contents

1. [Health Check](#health-check)
2. [Getting Data](#getting-data)
3. [Sending Commands](#sending-commands)
4. [Real-Time Updates (SSE)](#real-time-updates-sse)
5. [Common Use Cases](#common-use-cases)
6. [Wildcards & Filtering](#wildcards--filtering)
7. [Troubleshooting](#troubleshooting)

---

## Health Check

### Check API Status

**Request:**
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/health"
```

**Response:**
```json
{
  "status": "healthy",
  "mqtt_connected": true,
  "cache_size": 397,
  "uptime_seconds": 245,
  "sse_subscribers": 0
}
```

**Fields:**
- `status` - Service health status
- `mqtt_connected` - MQTT broker connection status
- `cache_size` - Number of cached topics
- `uptime_seconds` - Service uptime in seconds
- `sse_subscribers` - Number of active SSE connections

---

## Getting Data

### Get All Cached Topics

Returns all topics currently in cache with their last known values.

**Request:**
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics"
```

**Response:**
```json
{
  "topics": {
    "zigbee2mqtt/main-eduard-bigwardrobe-switch": {
      "payload": {
        "state": "ON",
        "state_left": "ON",
        "state_right": "OFF",
        "power": 0,
        "linkquality": 116
      },
      "timestamp": "2025-12-02T13:41:12.800390",
      "topic": "zigbee2mqtt/main-eduard-bigwardrobe-switch"
    }
  },
  "total": 397
}
```

### Get Specific Topic

Returns cached value for a single MQTT topic.

**Request:**
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/main-eduard-bigwardrobe-switch"
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "payload": {
      "consumption": 56.87,
      "device_temperature": 30,
      "state": "ON",
      "state_left": "ON",
      "state_right": "OFF",
      "power": 0,
      "linkquality": 116
    },
    "timestamp": "2025-12-02T13:41:12.800390",
    "topic": "zigbee2mqtt/main-eduard-bigwardrobe-switch"
  },
  "error": null
}
```

**Response (not found):**
```json
{
  "success": false,
  "data": null,
  "error": "Topic not found in cache: zigbee2mqtt/unknown_device"
}
```

### Filter Topics List

Get only first 5 topic names:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | keys | .[0:5]'
```

**Output:**
```json
[
  "appletv/apps",
  "appletv/availability",
  "appletv/state",
  "automation/bedroom/wardrobe-motion/config",
  "automation/bedroom/wardrobe-motion/status"
]
```

Search for specific topics:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | keys | map(select(contains("eduard") or contains("wardrobe")))'
```

**Output:**
```json
[
  "automation/main/eduard/wardrobes_light_auto/status",
  "zigbee2mqtt/main-eduard-bigwardrobe-switch",
  "zigbee2mqtt/main-eduard-bigwardrobe_left-contact_sensor",
  "zigbee2mqtt/main-eduard-bigwardrobe_right-contact_sensor",
  "zigbee2mqtt/main-eduard-smallwardrobe-contact_sensor",
  "zigbee2mqtt/main-eduard-smallwardrobe-dimme",
  "zigbee2mqtt/main-eduard-storage-contact_sensor",
  "zigbee2mqtt/main-eduard-storage-switch"
]
```

---

## Sending Commands

### Publish to MQTT Topic

Send commands to control devices via MQTT.

**Request:**
```bash
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/main-eduard-bigwardrobe-switch/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"state_left": "ON", "state_right": "ON"}'
```

**Response (success):**
```json
{
  "success": true,
  "topic": "zigbee2mqtt/main-eduard-bigwardrobe-switch/set",
  "error": null
}
```

**Response (error):**
```json
{
  "success": false,
  "topic": "zigbee2mqtt/device/set",
  "error": "MQTT client not connected"
}
```

### Common Device Commands

**Light Control:**
```bash
# Turn on
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/light_1/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"state": "ON"}'

# Turn off
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/light_1/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"state": "OFF"}'

# Set brightness
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/light_1/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"state": "ON", "brightness": 200}'
```

**Switch Control (Double):**
```bash
# Both buttons ON
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/switch/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"state_left": "ON", "state_right": "ON"}'

# Left ON, Right OFF
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/switch/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"state_left": "ON", "state_right": "OFF"}'
```

**Curtain Control:**
```bash
# Open fully (100%)
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/curtain/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"position": 100}'

# Close fully (0%)
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/curtain/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"position": 0}'

# Half open (50%)
curl -X POST "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/curtain/set" \
  -u admin:test \
  -H "Content-Type: application/json" \
  -d '{"position": 50}'
```

---

## Real-Time Updates (SSE)

Server-Sent Events provide real-time updates when MQTT topics change. Much more efficient than polling.

### Basic SSE Connection

**All Topics:**
```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream"
```

**Output:**
```
data: {"topic": "zigbee2mqtt/light_1", "payload": {"state": "ON", "brightness": 200}, "timestamp": "2025-12-02T13:41:12.800390"}

data: {"topic": "zigbee2mqtt/sensor_1", "payload": {"temperature": 22.5, "humidity": 45}, "timestamp": "2025-12-02T13:41:15.123456"}
```

**Important:** Use `-N` flag to disable buffering, otherwise events won't arrive immediately.

### Filtered SSE Streams

**Only Zigbee Devices:**
```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=zigbee2mqtt/*"
```

**Only Automations:**
```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=automation/*"
```

**Specific Device Pattern:**
```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=zigbee2mqtt/main-eduard-*"
```

**Output:**
```
data: {"topic": "zigbee2mqtt/main-eduard-bigwardrobe-switch", "payload": {"state": "ON", "state_left": "ON", "state_right": "OFF", "power": 0, "linkquality": 116}, "timestamp": "2025-12-02T13:41:12.800390"}

data: {"topic": "zigbee2mqtt/main-eduard-bigwardrobe_right-contact_sensor", "payload": {"battery": 100, "contact": true, "linkquality": 116}, "timestamp": "2025-12-02T13:41:13.180662"}
```

**Multiple Patterns:**
```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=zigbee2mqtt/light_*,zigbee2mqtt/sensor_*"
```

```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=zigbee2mqtt/*,automation/*/status"
```

### Monitor SSE Subscribers

Check how many clients are connected to SSE:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/health" | jq '.sse_subscribers'
```

**Output:**
```
3
```

### SSE Event Format

Each event is a JSON object with:
- `topic` - MQTT topic path
- `payload` - Device state/data (JSON object)
- `timestamp` - ISO 8601 timestamp when message was received

---

## Wildcards & Filtering

### Wildcard Patterns

| Pattern              | Matches                                                   |
|----------------------|-----------------------------------------------------------|
| `*`                  | All topics                                                |
| `zigbee2mqtt/*`      | zigbee2mqtt/light_1, zigbee2mqtt/sensor_1, ...            |
| `zigbee2mqtt/light_*`| zigbee2mqtt/light_1, zigbee2mqtt/light_2, ...             |
| `automation/*/status`| automation/bedroom/status, automation/kitchen/status, ... |
| `automation/bedroom/*`| All topics under automation/bedroom                      |

### Multiple Patterns

Combine patterns with commas:
```bash
?topics=zigbee2mqtt/*,automation/*/status,home/presence/*
```

---

## Common Use Cases

### 1. Monitor Device Status

Check if a device is online and get its current state:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topic?path=zigbee2mqtt/main-eduard-bigwardrobe-switch" | jq '.data.payload | {state, linkquality, last_seen}'
```

**Output:**
```json
{
  "state": "ON",
  "linkquality": 116,
  "last_seen": "2025-12-02T13:41:12.799Z"
}
```

### 2. Find All Lights

```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | keys | map(select(contains("light")))'
```

**Output:**
```json
[
  "zigbee2mqtt/bedroom-light",
  "zigbee2mqtt/kitchen-light",
  "zigbee2mqtt/main-eduard-brightlight-switch"
]
```

### 3. Get All Sensors Data

```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | to_entries | map(select(.key | contains("sensor"))) | map({topic: .key, payload: .value.payload})'
```

### 4. Check All Device Batteries

```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | to_entries | map(select(.value.payload.battery)) | map({topic: .key, battery: .value.payload.battery})'
```

**Output:**
```json
[
  {
    "topic": "zigbee2mqtt/main-eduard-bigwardrobe_right-contact_sensor",
    "battery": 100
  },
  {
    "topic": "zigbee2mqtt/bedroom-motion-sensor",
    "battery": 87
  }
]
```

### 5. Real-Time Motion Detection

Monitor all motion sensors:
```bash
curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=zigbee2mqtt/*motion*,zigbee2mqtt/*contact*"
```

### 6. Monitor Smart Home Health

Check all device link quality:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | to_entries | map(select(.value.payload.linkquality)) | map({topic: .key, linkquality: .value.payload.linkquality}) | sort_by(.linkquality)'
```

---

## Troubleshooting

### Check API Availability

```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/health"
```

If connection fails:
- Verify API is running on port 8081
- Check network connectivity to 10.0.20.102
- Verify credentials (admin:test)

### Check MQTT Connection

```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/health" | jq '.mqtt_connected'
```

**Output:**
```
true
```

If `false`, MQTT broker is not connected.

### Topic Not Found

If topic returns "not found":
```json
{
  "success": false,
  "error": "Topic not found in cache: zigbee2mqtt/unknown"
}
```

Reasons:
- Device never published to this topic
- Topic is filtered (homeassistant/*, zigbee2mqtt/bridge/*, /set, /get, /cmd)
- Device is offline
- Topic path is incorrect

List all topics to verify:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | keys | map(select(contains("device_name")))'
```

### Command Not Working

If POST returns success but device doesn't respond:
- Verify topic path ends with `/set`
- Check device supports the command
- Verify JSON payload format
- Check device is online (linkquality > 0)

Get device current state to verify topic path:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/topics" | jq '.topics | keys | map(select(contains("device_name")))'
```

### SSE Connection Drops

If SSE disconnects frequently:
- Network issues between client and API
- Firewall timeout (increase keep-alive)
- API restart

EventSource (browsers) automatically reconnect. For curl, use a loop:
```bash
while true; do
  curl -u admin:test -N "http://10.0.20.102:8081/api/v1/stream?topics=zigbee2mqtt/*"
  echo "Reconnecting..."
  sleep 1
done
```

---

## Cache Behavior

### What Gets Cached

All MQTT messages are cached in memory for fast access.

**Excluded from cache:**
- `homeassistant/*` - Home Assistant auto-discovery
- `zigbee2mqtt/bridge/*` - Zigbee2MQTT system topics
- Topics ending with `/set`, `/get`, `/cmd` - Commands, not states

### Cache Persistence

- Saved to disk every 30 seconds
- Loaded from `cache.json` on startup
- Final save on graceful shutdown

### Cache Size

Check current cache size:
```bash
curl -u admin:test "http://10.0.20.102:8081/api/v1/health" | jq '.cache_size'
```

**Output:**
```
397
```

---

## Performance Notes

### REST API
- Fast reads from memory cache
- ~0.5kb per single topic request
- ~282kb for all topics (397 items)

### SSE Stream
- Single HTTP connection per client
- Events only on actual changes (deduplication)
- Minimal network overhead
- Multiple clients supported (thread-safe)

### Recommended Usage

- **Dashboard:** Use SSE for real-time updates
- **Command & Control:** Use POST /topic
- **Initial State:** Use GET /topics once, then SSE for updates
- **Monitoring:** SSE with filtered topics
- **Batch Operations:** Multiple POST requests in sequence

---

## Security

### Authentication

All endpoints require HTTP Basic Auth:
- Username: `admin`
- Password: `test`

### CORS

API allows all origins (suitable for local network).

### Production Recommendations

- Change default password in `.env`
- Use HTTPS with reverse proxy
- Implement rate limiting
- Restrict CORS to specific origins
- Use firewall rules for network isolation

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/topic?path=<topic>` | Get single topic from cache |
| GET | `/topics` | Get all cached topics |
| POST | `/topic?path=<topic>` | Publish message to MQTT |
| GET | `/stream` | SSE real-time updates (all topics) |
| GET | `/stream?topics=<patterns>` | SSE filtered by wildcard patterns |

---

## Support

For issues or questions:
1. Check `/health` endpoint for service status
2. Verify MQTT connection is active
3. List all topics to find correct paths
4. Use SSE to monitor real-time events
5. Check device linkquality for connectivity issues
