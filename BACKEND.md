# Home Panel Backend - Architecture Documentation

## Overview

Backend представляет собой **минимальную прослойку** между фронтендом и микросервисами домашней инфраструктуры. Основная задача - проксирование запросов с единой авторизацией, агрегация метрик и SSE connection pooling.

**Технологии:**
- FastAPI (async Python web framework)
- SQLite (для хранения метрик)
- httpx (async HTTP client для проксирования)
- APScheduler (background tasks)
- python-jose (JWT authentication)

**Принципы:**
- Stateless API
- Максимум логики на фронте
- Минимум бизнес-логики на бекенде
- Чистое проксирование без модификации данных
- Connection pooling для SSE streams

---

## Architecture

```
Frontend (React)
    ↓ HTTP/SSE
Backend (FastAPI) - THIS
    ↓ HTTP
Microservices:
    - Proxmox APIs (10.0.10.10, 10.0.20.10)
    - Frigate API (10.0.10.3:5000)
    - MQTT API (10.0.20.102:8081)
    - Automation API (10.0.20.102:8080)
    - AI Hub / Claude Code API (10.99.10.106:9876)
```

---

## Configuration

### Environment Variables (.env)

Все настройки в одном файле `.env`:

```
# Core
ENV - development | production
LOG_LEVEL - INFO | DEBUG | WARNING | ERROR
ENABLE_MOCK_DATA - true | false (для разработки без реальных API)

# Server
HOST - 0.0.0.0
PORT - 8000

# Authentication
ACCESS_TOKEN - токен для входа в панель
JWT_SECRET - auto-generated on first start

# Proxmox Servers
PROXMOX_NAS_* - настройки для 10.0.10.10
PROXMOX_SMART_* - настройки для 10.0.20.10

# Services
FRIGATE_URL
MQTT_API_URL + credentials
AUTOMATION_API_URL + credentials
AI_HUB_URL + credentials

# Database
DATABASE_PATH - путь к SQLite файлу

# Metrics
METRICS_INTERVAL_* - интервалы сбора метрик
METRICS_RETENTION_* - retention policies
```

Подробнее: см. `.env.example`

---

## API Endpoints

### Base URL

- Development: `http://localhost:8000`
- Production: `http://10.0.20.102:8000` (или другой IP)

Все endpoints префиксированы `/api/`

### Authentication

#### POST `/api/auth/login`

Вход в систему по токену доступа.

**Request:**
```json
{
  "token": "mK9$nP2@vL4#zR8*wQ6!xT3"
}
```

**Response (Success):**
```json
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 604800
}
```

**Response (Error):**
```json
{
  "detail": "Неверный токен доступа"
}
```

**Status Codes:**
- 200 - Успешная авторизация
- 401 - Неверный токен

**JWT Token:**
- Действителен 7 дней (168 часов)
- Используется в заголовке `Authorization: Bearer {jwt}`
- Автоматически обновляется фронтом при истечении

#### Middleware: JWT Verification

Все endpoints кроме `/api/auth/login` требуют валидный JWT в заголовке.

**Request Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Error Response:**
```json
{
  "detail": "Unauthorized"
}
```

---

### Proxmox API

Проксирование запросов к Proxmox API с автоматической авторизацией.

**Документация Proxmox API:**
- См. `/home/user/my-home-panel/tests/proxmox/PROXMOX_API_DOCUMENTATION.md`

#### GET `/api/proxmox/servers`

Список всех Proxmox серверов с их статусами.

**Response:**
```json
{
  "servers": [
    {
      "id": "nas",
      "name": "NAS Server",
      "ip": "10.0.10.10",
      "node": "nas",
      "online": true,
      "version": "8.3.2",
      "uptime": 134340,
      "cpu_count": 12,
      "cpu_usage": 0.235,
      "memory_total": 66571993088,
      "memory_used": 52457566208,
      "memory_percent": 78.8
    },
    {
      "id": "smart-home",
      "name": "Smart Home Server",
      "ip": "10.0.20.10",
      "node": "pve",
      "online": true,
      "version": "9.0.6",
      "uptime": 464100,
      "cpu_count": 4,
      "cpu_usage": 0.05,
      "memory_total": 16106127360,
      "memory_used": 6660751360,
      "memory_percent": 41.3
    }
  ]
}
```

**Логика:**
1. Читает список серверов из `.env` (PROXMOX_NAS_*, PROXMOX_SMART_*)
2. Параллельно опрашивает каждый Proxmox API `/api2/json/nodes/{node}/status`
3. Агрегирует результаты
4. Возвращает unified список

**Обработка ошибок:**
- Если сервер недоступен: `online: false`, остальные поля null
- Timeout: 5 секунд на сервер
- Не падает если один сервер недоступен

#### GET `/api/proxmox/{server_id}/status`

Детальный статус конкретного сервера.

**Path Parameters:**
- `server_id` - "nas" или "smart-home"

**Response:**
```json
{
  "server_id": "nas",
  "node": "nas",
  "status": "online",
  "uptime": 134340,
  "loadavg": [1.11, 1.13, 1.10],
  "cpu": {
    "count": 12,
    "usage": 0.235,
    "model": "Intel N150"
  },
  "memory": {
    "total": 66571993088,
    "used": 52457566208,
    "free": 14114426880,
    "percent": 78.8
  },
  "swap": {
    "total": 8589934592,
    "used": 2469606195,
    "free": 6120328397,
    "percent": 28.7
  },
  "rootfs": {
    "total": 100931985408,
    "used": 69660667904,
    "free": 26098614272,
    "percent": 72.8
  }
}
```

**Проксирование:**
- `GET https://10.0.10.10:8006/api2/json/nodes/nas/status`
- Добавляет заголовок `Authorization: PVEAPIToken={token}`
- Возвращает JSON как есть с добавлением `server_id`

#### GET `/api/proxmox/{server_id}/vms`

Список всех VM и контейнеров на сервере.

**Response:**
```json
{
  "server_id": "nas",
  "total": 24,
  "vms": 4,
  "containers": 20,
  "running": 16,
  "stopped": 8,
  "instances": [
    {
      "vmid": 999,
      "type": "qemu",
      "name": "VPN-HUB",
      "status": "running",
      "uptime": 134000,
      "cpu": 0.05,
      "maxcpu": 2,
      "mem": 1073741824,
      "maxmem": 1073741824,
      "disk": 0,
      "maxdisk": 17179869184
    },
    {
      "vmid": 100,
      "type": "lxc",
      "name": "ubuntu",
      "status": "stopped",
      "uptime": 0,
      "cpu": 0,
      "maxcpu": 2,
      "mem": 0,
      "maxmem": 2147483648,
      "disk": 0,
      "maxdisk": 10737418240
    }
  ]
}
```

**Логика:**
1. Запрос к `/api2/json/nodes/{node}/qemu` (VM)
2. Запрос к `/api2/json/nodes/{node}/lxc` (контейнеры)
3. Объединяет результаты
4. Добавляет `type: "qemu"` или `type: "lxc"`
5. Сортирует по vmid

#### GET `/api/proxmox/{server_id}/vm/{vmid}`

Детальная информация о VM/контейнере.

**Response:**
```json
{
  "vmid": 999,
  "type": "qemu",
  "name": "VPN-HUB",
  "node": "nas",
  "status": "running",
  "uptime": 134000,
  "cpu": 0.05,
  "cpus": 2,
  "mem": 1073741824,
  "maxmem": 1073741824,
  "disk": 0,
  "maxdisk": 17179869184,
  "netin": 1234567890,
  "netout": 9876543210,
  "diskread": 123456789,
  "diskwrite": 987654321
}
```

**Проксирование:**
- `GET /api2/json/nodes/{node}/qemu/{vmid}/status/current`
- или `/api2/json/nodes/{node}/lxc/{vmid}/status/current`

#### POST `/api/proxmox/{server_id}/vm/{vmid}/start`

Запуск VM/контейнера.

**Response:**
```json
{
  "success": true,
  "task": "UPID:nas:0001234:0056789:...",
  "message": "Запуск VM 999"
}
```

**Проксирование:**
- `POST /api2/json/nodes/{node}/qemu/{vmid}/status/start`

#### POST `/api/proxmox/{server_id}/vm/{vmid}/stop`

Остановка VM/контейнера.

**Response:**
```json
{
  "success": true,
  "task": "UPID:nas:0001234:0056789:...",
  "message": "Остановка VM 999"
}
```

#### POST `/api/proxmox/{server_id}/vm/{vmid}/restart`

Перезагрузка VM/контейнера.

**Response:**
```json
{
  "success": true,
  "task": "UPID:nas:0001234:0056789:...",
  "message": "Перезагрузка VM 999"
}
```

---

### Frigate API

Проксирование к Frigate NVR API.

**Документация Frigate API:**
- См. `/home/user/my-home-panel/tests/frigate/FRIGATE_API_DOCUMENTATION.md`

#### GET `/api/frigate/cameras`

Список всех камер.

**Response:**
```json
{
  "cameras": [
    {
      "name": "cam-doorbell",
      "enabled": true,
      "fps": 5,
      "width": 1920,
      "height": 1080,
      "detect_enabled": true,
      "record_enabled": true,
      "snapshots_enabled": true
    }
  ]
}
```

**Проксирование:**
- `GET http://10.0.10.3:5000/api/config`
- Парсит секцию `cameras`

#### GET `/api/frigate/camera/{name}/snapshot`

Получить последний snapshot камеры.

**Query Parameters:**
- `h` - высота изображения (опционально, default: 360)

**Response:**
- Content-Type: `image/jpeg`
- Binary JPEG данные

**Проксирование:**
- `GET http://10.0.10.3:5000/api/{name}/latest.jpg?h={h}`
- Прямой proxy бинарных данных

#### GET `/api/frigate/events`

События детекции.

**Query Parameters:**
- `camera` - фильтр по камере (опционально)
- `label` - фильтр по типу (person, car, dog, etc.)
- `limit` - количество событий (default: 10)
- `has_snapshot` - true (опционально)

**Response:**
```json
{
  "events": [
    {
      "id": "1234567890.123456-abcdef",
      "camera": "cam-doorbell",
      "label": "person",
      "score": 0.95,
      "start_time": 1733184000.5,
      "end_time": 1733184010.2,
      "has_snapshot": true,
      "has_clip": true,
      "zones": ["entry"]
    }
  ]
}
```

**Проксирование:**
- `GET http://10.0.10.3:5000/api/events`

#### GET `/api/frigate/stats`

Статистика Frigate.

**Response:**
```json
{
  "service": {
    "uptime": 134000,
    "version": "0.13.0"
  },
  "cameras": {
    "cam-doorbell": {
      "fps": 5.1,
      "detection_fps": 4.8,
      "process_fps": 5.0,
      "skipped_fps": 0.0
    }
  },
  "detectors": {
    "coral": {
      "inference_speed": 12.5,
      "detection_start": 1733184000.0
    }
  }
}
```

**Проксирование:**
- `GET http://10.0.10.3:5000/api/stats`

---

### MQTT API

Проксирование к MQTT API для управления умным домом.

**Документация MQTT API:**
- См. `/home/user/my-home-panel/tests/mqtt-api/MQTT_API_GUIDE.md`

#### GET `/api/mqtt/topics`

Список всех MQTT топиков (устройств).

**Response:**
```json
{
  "topics": [
    {
      "path": "zigbee2mqtt/main-eduard-big-wardrobe-left-door",
      "payload": {
        "contact": false,
        "battery": 100,
        "linkquality": 116,
        "voltage": 3000
      },
      "timestamp": "2025-12-02T15:30:45.123456"
    }
  ]
}
```

**Проксирование:**
- `GET http://10.0.20.102:8081/api/v1/topics`
- Добавляет HTTP Basic Auth (`admin:test`)

#### POST `/api/mqtt/publish`

Публикация сообщения в MQTT топик (управление устройством).

**Request:**
```json
{
  "topic": "zigbee2mqtt/main-eduard-big-wardrobe-switch/set",
  "payload": {
    "state_left": "ON"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Сообщение опубликовано"
}
```

**Проксирование:**
- `POST http://10.0.20.102:8081/api/v1/topic?path={topic}`
- Body: payload как есть

#### GET `/api/mqtt/stream` (SSE)

**Server-Sent Events stream** всех MQTT событий.

**Response (SSE format):**
```
event: mqtt
data: {"topic":"zigbee2mqtt/main-eduard-big-wardrobe-switch","payload":{"state_left":"ON","state_right":"OFF","linkquality":116},"timestamp":"2025-12-02T15:30:45.123456"}

event: mqtt
data: {"topic":"zigbee2mqtt/kitchen-temperature","payload":{"temperature":22.5,"humidity":45,"battery":87},"timestamp":"2025-12-02T15:30:46.234567"}

: ping
```

**Connection Pooling:**

Backend держит **ОДНО** подключение к MQTT API SSE:
1. При первом подключении клиента открывает stream к MQTT API
2. Все события раздаёт всем подключенным фронтенд клиентам
3. При отключении последнего клиента закрывает MQTT stream
4. Минимизирует нагрузку на MQTT API

**Логика:**
```python
# Глобальное состояние
mqtt_stream_client = None  # httpx AsyncClient
mqtt_stream_response = None  # Stream response
frontend_clients = []  # Список подключенных фронтов

async def mqtt_stream():
    global mqtt_stream_client, frontend_clients

    # Открыть MQTT stream если ещё не открыт
    if not mqtt_stream_client:
        mqtt_stream_client = httpx.AsyncClient()
        mqtt_stream_response = await mqtt_stream_client.get(
            'http://10.0.20.102:8081/api/v1/stream',
            auth=('admin', 'test'),
            timeout=None
        )

    # Добавить клиента
    frontend_clients.append(current_client)

    # Читать события и раздавать
    async for line in mqtt_stream_response.aiter_lines():
        for client in frontend_clients:
            await client.send(line)
```

---

### Automation API

Проксирование к Automation Monitor API.

**Документация Automation API:**
- См. `/home/user/my-home-panel/tests/automation-api/USER_GUIDE.md`
- См. `/home/user/my-home-panel/tests/automation-api/TEST_REPORT.md`

#### GET `/api/automations`

Список всех автоматизаций.

**Response:**
```json
{
  "total": 11,
  "running": 9,
  "stopped": 2,
  "automations": [
    {
      "container_name": "automation-monitor",
      "automation_name": "monitor",
      "container": {
        "id": "8e9ecd152f46",
        "status": "running",
        "uptime_seconds": 4282
      },
      "mqtt": {
        "status": {
          "status": "running",
          "uptime": 4260,
          "triggers_count": 653,
          "errors_count": 0,
          "last_trigger": "2025-12-02T13:45:56.258551"
        }
      },
      "health": {
        "overall": "healthy",
        "docker_running": true,
        "mqtt_responding": true
      }
    }
  ]
}
```

**Проксирование:**
- `GET http://10.0.20.102:8080/api/automations`
- HTTP Basic Auth (`admin:test`)

#### GET `/api/automations/{name}`

Детали конкретной автоматизации.

**Path Parameters:**
- `name` - automation_name или container_name

**Response:**
```json
{
  "container_name": "automation-main-kitchen-motion_light",
  "automation_name": "main/kitchen/motion_light",
  "container": {
    "status": "running",
    "uptime_seconds": 7200
  },
  "mqtt": {
    "status": {
      "status": "running",
      "triggers_count": 153,
      "errors_count": 0,
      "last_trigger": "2025-12-02T15:25:00.123456"
    }
  },
  "health": {
    "overall": "healthy",
    "docker_running": true,
    "mqtt_responding": true
  }
}
```

**Проксирование:**
- `GET http://10.0.20.102:8080/api/automations/{name}`

#### POST `/api/automations/{name}/restart`

Перезапустить автоматизацию.

**Response:**
```json
{
  "success": true,
  "action": "restart",
  "container_name": "automation-main-kitchen-motion_light",
  "message": "Контейнер перезапущен",
  "new_status": "running"
}
```

**Проксирование:**
- `POST http://10.0.20.102:8080/api/control/{name}/restart`

#### POST `/api/automations/{name}/stop`

Остановить автоматизацию.

#### POST `/api/automations/{name}/start`

Запустить автоматизацию.

#### GET `/api/automations/{name}/logs` (SSE)

Stream логов автоматизации в реальном времени.

**Query Parameters:**
- `lines` - количество последних строк (default: 100)

**Response (SSE format):**
```
event: log
data: 2025-12-02T15:30:45.123456Z 2025-12-02 15:30:45 - kitchen - INFO - Motion detected

event: log
data: 2025-12-02T15:30:45.234567Z 2025-12-02 15:30:45 - kitchen - INFO - Light turned ON

: ping
```

**Проксирование:**
- `GET http://10.0.20.102:8080/api/logs/{name}?lines={lines}`
- Stream передаётся как есть

---

### AI Hub (Claude Code API)

Проксирование к Claude Code API Hub.

**Документация AI Hub API:**
- См. `/home/user/my-home-panel/tests/ai/CLAUDE_CODE_API_DOCUMENTATION.md`

#### POST `/api/ai/chat` (SSE)

Отправка сообщения AI с streaming ответа.

**Request:**
```json
{
  "message": "проверь диски на PVE-1",
  "system_prompt": "Ты управляешь Proxmox серверами...",
  "cwd": "/home/user/servers",
  "session_id": "uuid-or-null"
}
```

**Response (SSE stream):**

См. полную документацию в `/home/user/my-home-panel/tests/ai/CLAUDE_CODE_API_DOCUMENTATION.md`

**Основные события:**

**1. System Init:**
```
event: message
data: {"type":"system","subtype":"init","session_id":"ee9196ed-af8a-47a9-9f92-797762bc45a2",...}
```

**2. Assistant Messages (text):**
```
event: message
data: {"type":"assistant","message":{"content":[{"type":"text","text":"Проверяю диски..."}]}}
```

**3. Assistant Messages (tool use):**
```
event: message
data: {"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"ssh root@10.0.10.10 'df -h'"}}]}}
```

**4. Tool Results:**
```
event: message
data: {"type":"user","message":{"content":[{"type":"tool_result","content":"Filesystem  Size Used...","tool_use_id":"..."}]},"tool_use_result":{...}}
```

**5. Result Summary:**
```
event: message
data: {"type":"result","subtype":"success","total_cost_usd":0.0123,"usage":{...}}
```

**6. Done:**
```
event: done
data: {"process_id":"uuid"}
```

**Проксирование:**
- `POST http://10.99.10.106:9876/chat`
- HTTP Basic Auth (`admin:{password}`)
- Передаёт SSE stream как есть фронту
- **НЕ модифицирует** JSON события

**Сохранение session_id:**

Фронтенд **должен** сохранить `session_id` из первого события `system/init` для продолжения разговора.

#### DELETE `/api/ai/chat/{process_id}`

Отменить выполнение AI запроса.

**Response:**
```json
{
  "status": "cancelled",
  "process_id": "uuid"
}
```

**Проксирование:**
- `DELETE http://10.99.10.106:9876/chat/{process_id}`

**Важно:** Отмена процесса НЕ удаляет session из Claude API - можно продолжить позже.

#### GET `/api/ai/processes`

Список активных AI процессов.

**Response:**
```json
{
  "processes": [
    {
      "process_id": "uuid",
      "cwd": "/home/user/servers",
      "model": "sonnet",
      "started_at": "2025-12-02T15:28:35.084741",
      "session_id": "uuid"
    }
  ],
  "count": 1
}
```

**Проксирование:**
- `GET http://10.99.10.106:9876/processes`

---

### Metrics API

Endpoints для получения собранных метрик из SQLite.

#### GET `/api/metrics/server/{server_id}`

Метрики сервера за период.

**Path Parameters:**
- `server_id` - "nas" или "smart-home"

**Query Parameters:**
- `period` - "1h" | "6h" | "24h" | "7d" | "30d" (default: "1h")

**Response:**
```json
{
  "server_id": "nas",
  "period": "1h",
  "interval": 10,
  "data": [
    {
      "timestamp": 1733184000,
      "cpu_percent": 23.5,
      "ram_used": 52457566208,
      "ram_total": 66571993088,
      "ram_percent": 78.8,
      "disk_read": 1234567,
      "disk_write": 9876543,
      "net_rx": 123456,
      "net_tx": 654321
    }
  ]
}
```

**Логика:**

1. Определить временной диапазон по периоду
2. Выбрать нужный уровень детализации:
   - 1h → RAW данные (каждые 10 сек)
   - 6h, 24h → MINUTE данные (каждую минуту)
   - 7d → FIVE_MIN данные (каждые 5 минут)
   - 30d → THIRTY_MIN данные (каждые 30 минут)
3. Query SQLite:
   ```sql
   SELECT * FROM servers_metrics
   WHERE server_id = ? AND timestamp > ?
   ORDER BY timestamp ASC
   ```
4. Вернуть массив точек

#### GET `/api/metrics/vm/{server_id}/{vmid}`

Метрики VM/контейнера за период.

**Response:**
```json
{
  "server_id": "nas",
  "vmid": 999,
  "period": "24h",
  "data": [
    {
      "timestamp": 1733184000,
      "cpu_percent": 5.2,
      "ram_used": 1073741824,
      "ram_total": 1073741824
    }
  ]
}
```

#### GET `/api/metrics/automation/{name}`

Метрики автоматизации (triggers count) за период.

**Response:**
```json
{
  "automation_name": "main/kitchen/motion_light",
  "period": "7d",
  "data": [
    {
      "timestamp": 1733184000,
      "triggers_count": 15,
      "errors_count": 0
    }
  ]
}
```

**Источник данных:**

Backend периодически опрашивает Automation API и сохраняет:
```sql
INSERT INTO automation_metrics (timestamp, automation_name, triggers_count, errors_count)
```

#### GET `/api/metrics/device/{topic}`

История состояния умного устройства.

**Path Parameters:**
- `topic` - MQTT topic (URL encoded)

**Query Parameters:**
- `period` - временной период

**Response:**
```json
{
  "topic": "zigbee2mqtt/main-eduard-big-wardrobe-switch",
  "period": "24h",
  "data": [
    {
      "timestamp": 1733184000,
      "state": {
        "state_left": "ON",
        "state_right": "OFF",
        "linkquality": 116
      }
    }
  ]
}
```

**Источник данных:**

Backend подписан на MQTT SSE stream и сохраняет изменения состояний:
```sql
INSERT INTO device_states (timestamp, topic, state_json)
```

---

## Database Schema (SQLite)

### Table: servers_metrics

Метрики Proxmox серверов.

```sql
CREATE TABLE servers_metrics (
    timestamp INTEGER NOT NULL,
    server_id TEXT NOT NULL,
    cpu_percent REAL,
    ram_used INTEGER,
    ram_total INTEGER,
    ram_percent REAL,
    disk_read INTEGER,
    disk_write INTEGER,
    net_rx INTEGER,
    net_tx INTEGER,
    PRIMARY KEY (timestamp, server_id)
);

CREATE INDEX idx_servers_time ON servers_metrics(server_id, timestamp);
```

**Retention:**
- RAW: хранится 1 час
- Downsampled к 1min: хранится 24 часа
- Downsampled к 5min: хранится 7 дней
- Downsampled к 30min: хранится 30 дней
- Downsampled к 1h: хранится 1 год

### Table: vms_metrics

Метрики VM и контейнеров.

```sql
CREATE TABLE vms_metrics (
    timestamp INTEGER NOT NULL,
    server_id TEXT NOT NULL,
    vmid INTEGER NOT NULL,
    cpu_percent REAL,
    ram_used INTEGER,
    ram_total INTEGER,
    PRIMARY KEY (timestamp, server_id, vmid)
);

CREATE INDEX idx_vms_time ON vms_metrics(server_id, vmid, timestamp);
```

**Retention:** аналогично servers_metrics

### Table: automation_metrics

Метрики автоматизаций.

```sql
CREATE TABLE automation_metrics (
    timestamp INTEGER NOT NULL,
    automation_name TEXT NOT NULL,
    triggers_count INTEGER,
    errors_count INTEGER,
    status TEXT,
    PRIMARY KEY (timestamp, automation_name)
);

CREATE INDEX idx_automation_time ON automation_metrics(automation_name, timestamp);
```

### Table: device_states

История состояний умных устройств.

```sql
CREATE TABLE device_states (
    timestamp INTEGER NOT NULL,
    topic TEXT NOT NULL,
    state_json TEXT NOT NULL,
    PRIMARY KEY (timestamp, topic)
);

CREATE INDEX idx_device_time ON device_states(topic, timestamp);
```

**state_json:** JSON строка с полным состоянием устройства

---

## Background Tasks

### Metrics Collector

**Интервалы сбора:**
- Proxmox серверы: каждые 10 секунд
- VM/CT: каждые 30 секунд
- Автоматизации: каждые 5 секунд (из MQTT)
- Устройства: при изменении (SSE события)

**Scheduler:**

Использует APScheduler для периодических задач.

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# Сбор метрик серверов
scheduler.add_job(
    collect_server_metrics,
    'interval',
    seconds=settings.METRICS_INTERVAL_SERVERS,
    id='collect_servers'
)

# Сбор метрик VM
scheduler.add_job(
    collect_vm_metrics,
    'interval',
    seconds=settings.METRICS_INTERVAL_VMS,
    id='collect_vms'
)

# Downsampling старых данных
scheduler.add_job(
    downsample_metrics,
    'cron',
    hour=3,  # Каждый день в 3:00
    id='downsample'
)

scheduler.start()
```

### collect_server_metrics()

```python
async def collect_server_metrics():
    servers = ["nas", "smart-home"]

    for server_id in servers:
        try:
            # GET /api/proxmox/{server_id}/status
            status = await get_server_status(server_id)

            # Сохранить в БД
            await db.execute(
                '''INSERT INTO servers_metrics
                   (timestamp, server_id, cpu_percent, ram_used, ram_total, ...)
                   VALUES (?, ?, ?, ?, ?, ...)''',
                (int(time.time()), server_id, status['cpu']['usage'], ...)
            )
        except Exception as e:
            logger.error(f"Failed to collect metrics for {server_id}: {e}")
```

**Обработка ошибок:**
- Не падает если один сервер недоступен
- Логирует ошибки
- Продолжает со следующим сервером

### collect_vm_metrics()

Аналогично серверам, но для всех VM/CT.

**Оптимизация:**
- Параллельный сбор с нескольких серверов
- Пропуск остановленных VM (status != running)

### downsample_metrics()

Ночная задача для агрегации данных.

**Логика:**

1. **RAW → MINUTE:**
   - Удалить RAW данные старше 1 часа
   - Усреднить значения за каждую минуту
   - Сохранить в те же таблицы с меткой MINUTE

2. **MINUTE → FIVE_MIN:**
   - Удалить MINUTE данные старше 24 часов
   - Усреднить за 5 минут

3. **FIVE_MIN → THIRTY_MIN:**
   - Удалить FIVE_MIN старше 7 дней
   - Усреднить за 30 минут

4. **THIRTY_MIN → HOUR:**
   - Удалить THIRTY_MIN старше 30 дней
   - Усреднить за час

5. **Удаление старых HOUR данных:**
   - Старше 1 года полностью удалить

**SQL пример (агрегация):**
```sql
-- Усреднить RAW данные за минуту
INSERT INTO servers_metrics_minute
SELECT
    (timestamp / 60) * 60 as minute_timestamp,
    server_id,
    AVG(cpu_percent),
    AVG(ram_used),
    ...
FROM servers_metrics
WHERE timestamp > ? AND timestamp < ?
GROUP BY (timestamp / 60), server_id
```

### MQTT State Tracker

Фоновая задача слушает MQTT SSE stream и сохраняет изменения.

```python
async def track_mqtt_states():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            'http://10.0.20.102:8081/api/v1/stream',
            auth=('admin', 'test'),
            timeout=None
        )

        async for line in response.aiter_lines():
            if line.startswith('data:'):
                event = json.loads(line[6:])

                # Сохранить в БД
                await db.execute(
                    '''INSERT INTO device_states (timestamp, topic, state_json)
                       VALUES (?, ?, ?)''',
                    (int(time.time()), event['topic'], json.dumps(event['payload']))
                )
```

**Обработка отключений:**
- При разрыве SSE соединения автоматически переподключается
- Exponential backoff при ошибках
- Логирование всех переподключений

---

## Error Handling

### HTTP Error Responses

Все ошибки возвращаются в единообразном формате:

```json
{
  "detail": "Описание ошибки",
  "error_code": "OPTIONAL_CODE",
  "timestamp": "2025-12-02T15:30:45.123456"
}
```

### Status Codes

- **200 OK** - Успешный запрос
- **401 Unauthorized** - Нет или неверный JWT
- **404 Not Found** - Ресурс не найден
- **422 Unprocessable Entity** - Ошибка валидации запроса
- **500 Internal Server Error** - Внутренняя ошибка сервера
- **502 Bad Gateway** - Микросервис недоступен
- **504 Gateway Timeout** - Таймаут запроса к микросервису

### Timeout Handling

Все запросы к микросервисам имеют timeout:

- Proxmox API: 10 секунд
- Frigate API: 5 секунд
- MQTT API: 5 секунд
- Automation API: 5 секунд
- AI Hub: 300 секунд (5 минут для AI ответа)

При таймауте возвращается 504 Gateway Timeout.

### Retry Logic

Для критичных запросов (сбор метрик):
- 3 попытки с exponential backoff (1s, 2s, 4s)
- После 3 неудач - логирование и пропуск

Для пользовательских запросов:
- Без retry (быстрая ошибка лучше долгого ожидания)

---

## Logging

### Log Levels

- **DEBUG** - Детальная информация для разработки
- **INFO** - Основные события (запуск, остановка, важные действия)
- **WARNING** - Предупреждения (таймауты, retries)
- **ERROR** - Ошибки которые не падают сервер
- **CRITICAL** - Критические ошибки

### Log Format

```
2025-12-02 15:30:45,123 - uvicorn.access - INFO - 192.168.1.100:54321 - "GET /api/proxmox/servers HTTP/1.1" 200
2025-12-02 15:30:46,234 - backend.api.proxmox - ERROR - Failed to connect to 10.0.10.10: Connection timeout
```

### Log Destinations

- **Console** (stdout) - всегда
- **File** (`./logs/backend.log`) - rotation по размеру (10MB, 5 файлов)

### Sensitive Data

**НИКОГДА** не логировать:
- Пароли и токены
- JWT токены
- API keys
- Полные MQTT payloads (могут содержать чувствительную инфу)

Можно логировать:
- IP адреса (локальная сеть)
- Названия серверов/устройств
- HTTP методы и пути
- Агрегированные метрики

---

## Security

### Authentication Flow

1. Пользователь вводит ACCESS_TOKEN на фронте
2. Frontend: POST /api/auth/login с токеном
3. Backend проверяет токен с .env
4. Backend генерирует JWT (срок 7 дней)
5. Frontend сохраняет JWT в localStorage
6. Frontend добавляет `Authorization: Bearer {jwt}` ко всем запросам
7. Backend middleware проверяет JWT на каждом запросе

### JWT Structure

```json
{
  "exp": 1733184000,  // Expiration timestamp
  "iat": 1732579200,  // Issued at
  "jti": "unique-id"  // JWT ID (для revocation в будущем)
}
```

**Алгоритм:** HS256 (HMAC SHA-256)
**Secret:** из .env (JWT_SECRET)

### HTTPS

**Development:** HTTP (localhost)
**Production:** Должен быть за HTTPS reverse proxy (nginx/traefik)

### CORS

Hardcoded в коде (не в .env):

```python
allow_origins = [
    "http://localhost:3000",  # Frontend dev
    "http://10.0.20.102:3000",  # Frontend production
]
```

**Не использовать:** `allow_origins=["*"]` (небезопасно)

### Rate Limiting

**TODO для production:**
- Ограничение на /api/auth/login: 5 попыток в минуту
- Ограничение на AI endpoints: 10 запросов в минуту
- Глобальное: 100 запросов в минуту на IP

Можно использовать slowapi или встроенный middleware.

### API Keys для микросервисов

Все токены/пароли хранятся в .env и инжектятся в запросы:
- Proxmox: `Authorization: PVEAPIToken={token}`
- MQTT/Automation: HTTP Basic Auth
- AI Hub: HTTP Basic Auth

**Никогда** не передаются фронту.

---

## Performance

### Connection Pooling

httpx AsyncClient с connection pooling:

```python
# Глобальный клиент
http_client = httpx.AsyncClient(
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
    timeout=httpx.Timeout(10.0)
)
```

Переиспользуется для всех запросов к микросервисам.

### Database Connections

SQLite с:
- WAL mode (Write-Ahead Logging) для лучшей производительности
- Connection pool для async операций (aiosqlite)

### Caching

**Не используется** на бекенде (логика на фронте).

Фронт может кэшировать:
- Список серверов (редко меняется)
- Список камер (редко меняется)
- Метрики кэшировать НЕ нужно (всегда актуальные)

### Metrics Collection Overhead

При 2 серверах и ~24 VM/CT:
- Серверы: 2 запроса каждые 10 сек = 12 req/min
- VM/CT: 24 запроса каждые 30 сек = 48 req/min
- **Total:** ~60 req/min к Proxmox API (negligible)

SQLite вставки:
- ~2000 INSERT/sec capability
- Фактически: ~2 INSERT/sec (легко)

---

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: home-panel-backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/.env:/app/.env
      - ./backend/data:/app/data
      - ./backend/logs:/app/logs
    environment:
      - ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Health Check Endpoint

**GET `/health`** (без /api/ префикса, без auth)

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "ok",
  "uptime_seconds": 12345
}
```

Используется Docker и мониторингом.

### Startup

1. Загрузить .env
2. Auto-generate JWT_SECRET если не задан
3. Инициализировать SQLite (создать таблицы если не существуют)
4. Запустить background tasks (scheduler)
5. Запустить FastAPI (uvicorn)

### Shutdown

Graceful shutdown:
1. Остановить scheduler
2. Закрыть все SSE connections
3. Закрыть HTTP clients
4. Закрыть DB connections
5. Exit

---

## Environment-Specific Behavior

### Development (ENV=development)

- LOG_LEVEL=DEBUG по умолчанию
- Детальные error messages
- CORS более permissive
- Auto-reload при изменении кода (uvicorn --reload)

### Production (ENV=production)

- LOG_LEVEL=INFO по умолчанию
- Минимальные error messages (без stack traces)
- Strict CORS
- No auto-reload
- Health check endpoint обязателен

### Mock Mode (ENABLE_MOCK_DATA=true)

Для разработки фронта без доступа к реальным API:

- Все endpoints возвращают fake данные
- Нет реальных запросов к микросервисам
- Быстрые ответы (без задержек)

**Пример:**
```python
if settings.ENABLE_MOCK_DATA:
    @app.get("/api/proxmox/servers")
    async def get_servers_mock():
        return {
            "servers": [
                {"id": "nas", "name": "NAS", "online": True, "cpu_usage": 0.25},
                {"id": "smart-home", "name": "Smart Home", "online": True, "cpu_usage": 0.05}
            ]
        }
```

---

## Testing

### Unit Tests

TODO: pytest для тестирования:
- Endpoints (без реальных микросервисов - mocking)
- Database queries
- Metrics collection logic
- Downsampling logic

### Integration Tests

TODO: Тесты с реальными микросервисами (test environment).

### Manual Testing

Использовать curl / httpie / Postman для ручного тестирования endpoints.

**Пример:**
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"token":"mK9$nP2@vL4#zR8*wQ6!xT3"}'

# Get servers (с JWT)
curl http://localhost:8000/api/proxmox/servers \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Monitoring & Observability

### Metrics to Monitor

**Application:**
- Request rate (req/sec)
- Error rate (%)
- Response time (p50, p95, p99)
- Active SSE connections count

**Database:**
- Database size (MB)
- Query duration
- Insert rate

**External Services:**
- Proxmox API response time
- MQTT API uptime
- AI Hub availability

### Prometheus (Future)

TODO: Добавить `/metrics` endpoint для Prometheus.

Экспортировать:
- HTTP request count (по endpoint)
- HTTP request duration histogram
- Active SSE connections gauge
- Database size gauge
- Metrics collection success rate

---

## Troubleshooting

### Backend не запускается

**Проверить:**
1. .env файл существует и содержит все обязательные переменные
2. Порт 8000 не занят: `lsof -i :8000`
3. Python версия 3.11+ (async синтаксис)
4. Зависимости установлены: `pip install -r requirements.txt`

### Proxmox endpoints возвращают 502

**Причины:**
- Proxmox сервер недоступен (ping 10.0.10.10)
- Неверный API token в .env
- Firewall блокирует доступ
- SSL certificate error (verify=False должен быть в httpx)

**Debug:**
```bash
# Проверить доступность
curl -k https://10.0.10.10:8006/api2/json/version

# Проверить с токеном
curl -k https://10.0.10.10:8006/api2/json/nodes/nas/status \
  -H "Authorization: PVEAPIToken=root@pam!test=48219818-..."
```

### SSE stream обрывается

**Причины:**
- Reverse proxy timeout (если есть) - увеличить timeout
- MQTT API перезапустился - auto-reconnect должен сработать
- Network issues - проверить стабильность сети

**Debug:**
- Проверить логи backend на reconnection attempts
- Проверить MQTT API logs

### Метрики не собираются

**Проверить:**
1. Background tasks запущены: проверить логи при старте
2. Database writeable: права на ./data/metrics.db
3. Микросервисы доступны: вручную вызвать endpoints

**Debug:**
```python
# В логах должно быть:
INFO - Scheduler started
INFO - Collecting server metrics...
INFO - Saved metrics for server nas
```

### High CPU/Memory usage

**Причины:**
- Слишком частая коллекция метрик (уменьшить интервалы)
- Слишком много SSE connections (frontend bug?)
- Database growth (проверить downsampling работает)

**Мониторинг:**
```bash
# CPU/Memory
docker stats home-panel-backend

# Database size
du -h ./data/metrics.db
```

---

## Future Improvements

### Short Term

- [ ] Rate limiting на auth endpoint
- [ ] Более детальное логирование AI requests
- [ ] Health check для каждого микросервиса
- [ ] Metrics export для Prometheus

### Long Term

- [ ] WebSocket вместо SSE для bidirectional communication
- [ ] Redis для distributed caching (если несколько инстансов)
- [ ] GraphQL вместо REST (опционально)
- [ ] Real-time notifications (push к фронту при критичных событиях)

---

## References

### External Documentation

- **Proxmox API:** `/home/user/my-home-panel/tests/proxmox/PROXMOX_API_DOCUMENTATION.md`
- **Frigate API:** `/home/user/my-home-panel/tests/frigate/FRIGATE_API_DOCUMENTATION.md`
- **MQTT API:** `/home/user/my-home-panel/tests/mqtt-api/MQTT_API_GUIDE.md`
- **Automation API User Guide:** `/home/user/my-home-panel/tests/automation-api/USER_GUIDE.md`
- **Automation API Test Report:** `/home/user/my-home-panel/tests/automation-api/TEST_REPORT.md`
- **AI Hub API:** `/home/user/my-home-panel/tests/ai/CLAUDE_CODE_API_DOCUMENTATION.md`

### Internal Documentation

- **UI Design:** `/home/user/my-home-panel/UI.md`
- **Environment Config:** `/home/user/my-home-panel/.env.example`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-02
**Author:** Home Panel Development Team
