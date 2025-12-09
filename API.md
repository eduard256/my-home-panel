# Home Panel Backend - API Documentation

## Base URL

```
http://localhost:8000
```

## Authentication

Все эндпоинты (кроме `/health` и `/api/auth/login`) требуют JWT токен в заголовке:

```
Authorization: Bearer <jwt_token>
```

---

## Auth

### POST `/api/auth/login`

Вход в систему.

**Request Body:**
- `token` (string, required) - токен доступа из .env

**Response:**
- `access_token` (string) - JWT токен
- `token_type` (string) - тип токена (bearer)
- `expires_in` (integer) - время жизни токена в секундах (604800 = 7 дней)

---

## Proxmox

### GET `/api/proxmox/servers`

Список всех Proxmox серверов.

**Response:**
- `servers` (array) - массив серверов
  - `id` (string) - ID сервера (nas, smart)
  - `name` (string) - имя сервера
  - `ip` (string) - IP адрес
  - `node` (string) - имя ноды
  - `online` (boolean) - статус доступности
  - `uptime` (integer) - uptime в секундах
  - `cpu` (float) - загрузка CPU в процентах
  - `memory_used` (integer) - использованная память в байтах
  - `memory_total` (integer) - всего памяти в байтах
  - `memory_percent` (float) - использование памяти в процентах
  - `disk_used` (integer) - использованное место на диске в байтах
  - `disk_total` (integer) - всего места на диске в байтах
  - `disk_percent` (float) - использование диска в процентах
  - `network_in` (integer|null) - входящий трафик
  - `network_out` (integer|null) - исходящий трафик
  - `load_average` (array) - load average [1m, 5m, 15m]
  - `vms_running` (integer) - количество запущенных VM
  - `vms_total` (integer) - всего VM
  - `cts_running` (integer) - количество запущенных контейнеров
  - `cts_total` (integer) - всего контейнеров
- `total` (integer) - количество серверов

### GET `/api/proxmox/servers/{server_id}`

Детальная информация о сервере.

**Path Parameters:**
- `server_id` (string) - ID сервера (nas, smart)

**Response:** такой же объект сервера как в `/servers`

### GET `/api/proxmox/servers/{server_id}/vms`

Список всех VM и контейнеров на сервере.

**Path Parameters:**
- `server_id` (string) - ID сервера

**Response:**
- `vms` (array) - массив VM/контейнеров
  - `vmid` (integer) - ID VM
  - `name` (string) - имя VM
  - `type` (string) - тип (qemu или lxc)
  - `status` (string) - статус (running, stopped, etc.)
  - `cpu` (float) - загрузка CPU в процентах
  - `memory_used` (integer) - использованная память в байтах
  - `memory_total` (integer) - всего памяти в байтах
  - `memory_percent` (float) - использование памяти в процентах
  - `disk_used` (integer) - использованное место в байтах
  - `disk_total` (integer) - всего места в байтах
  - `uptime` (integer) - uptime в секундах
- `total` (integer) - количество VM
- `running` (integer) - количество запущенных
- `stopped` (integer) - количество остановленных

### GET `/api/proxmox/servers/{server_id}/vm/{vmid}`

Детальная информация о конкретной VM/контейнере.

**Path Parameters:**
- `server_id` (string) - ID сервера
- `vmid` (integer) - ID VM

**Query Parameters:**
- `vm_type` (string, default: qemu) - тип VM (qemu или lxc)

**Response:** объект VM такой же как в `/vms`

### POST `/api/proxmox/servers/{server_id}/vm/{vmid}/{action}`

Управление VM/контейнером.

**Path Parameters:**
- `server_id` (string) - ID сервера
- `vmid` (integer) - ID VM
- `action` (string) - действие: start, stop, shutdown, restart, reset, suspend, resume

**Query Parameters:**
- `vm_type` (string, default: qemu) - тип VM (qemu или lxc)

**Response:**
- `success` (boolean) - успешность операции
- `action` (string) - выполненное действие
- `vmid` (integer) - ID VM
- `message` (string) - сообщение

---

## Frigate

### GET `/api/frigate/cameras`

Список всех камер.

**Response:**
- `cameras` (array) - массив камер
  - `name` (string) - имя камеры
  - `enabled` (boolean) - включена ли камера
  - `detect_enabled` (boolean) - включена ли детекция
  - `record_enabled` (boolean) - включена ли запись
  - `snapshots_enabled` (boolean) - включены ли снапшоты
  - `audio_enabled` (boolean) - включен ли звук
  - `width` (integer) - ширина видео
  - `height` (integer) - высота видео
  - `fps` (integer) - FPS
- `total` (integer) - количество камер

### GET `/api/frigate/cameras/{camera_name}/snapshot`

Получить снапшот с камеры.

**Path Parameters:**
- `camera_name` (string) - имя камеры

**Query Parameters:**
- `quality` (integer, default: 70) - качество JPEG (1-100)
- `height` (integer, optional) - высота изображения (масштабирование)

**Response:** JPEG изображение (Content-Type: image/jpeg)

### GET `/api/frigate/events`

Список событий детекции.

**Query Parameters:**
- `limit` (integer, default: 100, max: 1000) - количество событий
- `camera` (string, optional) - фильтр по камере
- `label` (string, optional) - фильтр по метке (person, car, etc.)
- `zone` (string, optional) - фильтр по зоне
- `after` (integer, optional) - события после timestamp
- `before` (integer, optional) - события до timestamp
- `has_snapshot` (boolean, optional) - только с снапшотами
- `has_clip` (boolean, optional) - только с клипами

**Response:**
- `events` (array) - массив событий
  - `id` (string) - ID события
  - `camera` (string) - имя камеры
  - `label` (string) - метка объекта
  - `sub_label` (string|null) - подметка
  - `start_time` (float) - время начала (unix timestamp)
  - `end_time` (float|null) - время окончания
  - `has_clip` (boolean) - есть ли видео клип
  - `has_snapshot` (boolean) - есть ли снапшот
  - `zones` (array) - зоны, в которых обнаружен объект
- `total` (integer) - количество событий

### GET `/api/frigate/stats`

Системная статистика Frigate.

**Response:**
- `service` (object) - информация о сервисе
  - `uptime` (integer) - uptime в секундах
  - `version` (string) - версия Frigate
  - `latest_version` (string) - последняя доступная версия
  - `storage` (object) - информация о хранилище
  - `temperatures` (object) - температуры компонентов
  - `last_updated` (integer) - timestamp последнего обновления
- `cameras` (object) - статистика по камерам (ключ = имя камеры)
  - `camera_fps` (float) - FPS камеры
  - `process_fps` (float) - FPS обработки
  - `detection_fps` (float) - FPS детекции
  - `pid` (integer) - PID процесса

---

## MQTT

### GET `/api/mqtt/topics`

Список всех MQTT топиков с последними значениями.

**Response:**
- `topics` (object) - объект с топиками (ключ = топик)
  - `topic` (string) - имя топика
  - `payload` (any) - последнее значение
  - `timestamp` (string) - время последнего обновления

### POST `/api/mqtt/publish`

Опубликовать сообщение в MQTT топик.

**Request Body:**
- `topic` (string, required) - топик для публикации
- `payload` (any, required) - данные для отправки

**Response:**
- `success` (boolean) - успешность операции
- `topic` (string) - топик
- `error` (string|null) - ошибка, если есть

### GET `/api/mqtt/stream`

SSE stream для получения обновлений в реальном времени.

**Response:** Server-Sent Events stream
- `event: message`
- `data: {topic, payload, timestamp}`

---

## Automations

### GET `/api/automations`

Список всех автоматизаций.

**Response:**
- `automations` (array) - массив автоматизаций
  - `container_name` (string) - имя Docker контейнера
  - `automation_name` (string) - имя автоматизации
  - `container` (object) - информация о контейнере
    - `id` (string) - ID контейнера
    - `status` (string) - статус (running, exited, etc.)
    - `image` (string) - Docker образ
    - `created` (string) - дата создания
    - `started` (string) - дата запуска
    - `uptime_seconds` (integer) - uptime в секундах
  - `mqtt` (object|null) - MQTT информация
    - `status` (object) - статус автоматизации
      - `status` (string) - статус (running, stopped, error)
      - `uptime` (integer) - uptime в секундах
      - `triggers_count` (integer) - количество срабатываний
      - `errors_count` (integer) - количество ошибок
      - `last_trigger` (string|null) - последнее срабатывание
      - `timestamp` (string) - время обновления
    - `ready` (object|null) - ready информация
    - `config` (object|null) - конфигурация
    - `last_seen` (string) - последнее обновление
  - `health` (object) - состояние здоровья
    - `overall` (string) - общий статус (healthy, degraded, offline, unhealthy)
    - `docker_running` (boolean) - запущен ли контейнер
    - `mqtt_responding` (boolean) - отвечает ли MQTT
- `total` (integer) - всего автоматизаций
- `running` (integer) - запущенных
- `stopped` (integer) - остановленных

### GET `/api/automations/{name}`

Информация о конкретной автоматизации.

**Path Parameters:**
- `name` (string) - имя автоматизации (container_name или automation_name)

**Response:** объект автоматизации такой же как в `/automations`

### POST `/api/automations/{name}/{action}`

Управление автоматизацией.

**Path Parameters:**
- `name` (string) - имя автоматизации
- `action` (string) - действие: start, stop, restart

**Response:**
- `success` (boolean) - успешность операции
- `action` (string) - выполненное действие
- `container_name` (string) - имя контейнера
- `message` (string) - сообщение
- `new_status` (string|null) - новый статус

### GET `/api/automations/{name}/logs`

SSE stream логов автоматизации.

**Path Parameters:**
- `name` (string) - имя автоматизации

**Query Parameters:**
- `tail` (integer, default: 100) - количество последних строк логов

**Response:** Server-Sent Events stream
- `event: log`
- `data: {timestamp, message}`

---

## AI Hub

### GET `/api/ai/health`

Проверка доступности AI Hub.

**Response:**
- `status` (string) - статус (ok или error)
- `claude_path` (string) - путь к Claude
- `claude_version` (string) - версия Claude

### POST `/api/ai/chat`

Начать SSE чат с AI.

**Request Body:**
- `prompt` (string, required) - запрос к AI
- `session_id` (string, optional) - ID сессии для продолжения диалога

**Response:** Server-Sent Events stream
- `event: message` - сообщения от AI
- `event: done` - завершение с process_id

### GET `/api/ai/processes`

Список активных AI процессов.

**Response:**
- `processes` (array) - массив процессов
  - `process_id` (string) - ID процесса
  - `cwd` (string) - рабочая директория
  - `model` (string) - используемая модель
  - `started_at` (string) - время запуска
  - `session_id` (string|null) - ID сессии
- `count` (integer) - количество процессов

### DELETE `/api/ai/chat/{process_id}`

Остановить AI процесс.

**Path Parameters:**
- `process_id` (string) - ID процесса для остановки

**Response:**
- `status` (string) - статус (cancelled)
- `process_id` (string) - ID остановленного процесса

---

## Metrics

### GET `/api/metrics/server/{server_id}`

Исторические метрики Proxmox сервера.

**Path Parameters:**
- `server_id` (string) - ID сервера

**Query Parameters:**
- `time_range` (string, default: 1h) - временной диапазон: 1h, 6h, 24h, 7d, 30d
- `limit` (integer, default: 1000, max: 10000) - максимум точек данных

**Response:**
- `server_id` (string) - ID сервера
- `data` (array) - массив точек данных
  - `timestamp` (string) - время
  - `cpu_percent` (float) - CPU в процентах
  - `memory_used` (integer) - использованная память в байтах
  - `memory_total` (integer) - всего памяти
  - `disk_used` (integer) - использованное место на диске
  - `disk_total` (integer) - всего места на диске
  - `network_in` (integer|null) - входящий трафик
  - `network_out` (integer|null) - исходящий трафик
  - `uptime` (integer) - uptime в секундах
- `total` (integer) - количество точек
- `time_range` (string) - временной диапазон
- `aggregation` (string|null) - уровень агрегации (raw, minute, 5min, 30min, hour)

### GET `/api/metrics/vm/{server_id}/{vmid}`

Исторические метрики VM/контейнера.

**Path Parameters:**
- `server_id` (string) - ID сервера
- `vmid` (integer) - ID VM

**Query Parameters:**
- `time_range` (string, default: 1h) - временной диапазон
- `limit` (integer, default: 1000, max: 10000) - максимум точек

**Response:**
- `server_id` (string) - ID сервера
- `vmid` (integer) - ID VM
- `data` (array) - массив точек данных
  - `timestamp` (string) - время
  - `status` (string) - статус VM
  - `cpu_percent` (float) - CPU в процентах
  - `memory_used` (integer) - использованная память
  - `memory_total` (integer) - всего памяти
  - `disk_read` (integer) - прочитано с диска
  - `disk_write` (integer) - записано на диск
  - `network_in` (integer) - входящий трафик
  - `network_out` (integer) - исходящий трафик
  - `uptime` (integer) - uptime в секундах
- `total` (integer) - количество точек
- `time_range` (string) - временной диапазон
- `aggregation` (string|null) - уровень агрегации

### GET `/api/metrics/automation/{name}`

Исторические метрики автоматизации.

**Path Parameters:**
- `name` (string) - имя автоматизации

**Query Parameters:**
- `time_range` (string, default: 1h) - временной диапазон
- `limit` (integer, default: 1000, max: 10000) - максимум точек

**Response:**
- `automation_name` (string) - имя автоматизации
- `data` (array) - массив точек данных
  - `timestamp` (string) - время
  - `status` (string) - статус
  - `health` (string) - здоровье
  - `triggers_count` (integer) - количество срабатываний
  - `errors_count` (integer) - количество ошибок
  - `cpu_percent` (float) - CPU в процентах
  - `memory_mb` (float) - память в МБ
- `total` (integer) - количество точек
- `time_range` (string) - временной диапазон

### GET `/api/metrics/device/{topic}`

История изменений состояния умного устройства.

**Path Parameters:**
- `topic` (string) - полный путь MQTT топика (например: zigbee2mqtt/main-eduard-bigwardrobe-switch)

**Query Parameters:**
- `time_range` (string, default: 1h) - временной диапазон
- `limit` (integer, default: 1000, max: 10000) - максимум точек

**Response:**
- `topic` (string) - топик устройства
- `data` (array) - массив состояний
  - `timestamp` (string) - время изменения
  - `payload` (any) - данные состояния устройства
- `total` (integer) - количество изменений
- `time_range` (string) - временной диапазон

---

## Health

### GET `/health`

Проверка работоспособности бекенда (доступен без авторизации).

**Response:**
- `status` (string) - статус (healthy)
- `version` (string) - версия API
- `environment` (string) - окружение (development, production)
- `uptime_seconds` (integer) - время работы в секундах
- `timestamp` (string) - текущее время

---

## Error Responses

Все ошибки возвращаются в формате:

```json
{
  "detail": "Описание ошибки"
}
```

Коды ответов:
- `200` - успешный запрос
- `400` - неверный запрос
- `401` - требуется авторизация
- `403` - доступ запрещен
- `404` - ресурс не найден
- `500` - внутренняя ошибка сервера

---

## Swagger Documentation

Интерактивная документация API доступна по адресу:

```
http://localhost:8000/docs
```
