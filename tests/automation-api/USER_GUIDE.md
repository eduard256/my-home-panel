# Automation-Monitor API - User Guide

**Версия:** 1.0.0
**Base URL:** `http://10.0.20.102:8080`
**Авторизация:** HTTP Basic Auth (admin:test)

---

## Содержание

1. [Введение](#введение)
2. [Начало работы](#начало-работы)
3. [Мониторинг системы](#мониторинг-системы)
4. [Управление автоматизациями](#управление-автоматизациями)
5. [Просмотр логов](#просмотр-логов)
6. [Мониторинг ресурсов](#мониторинг-ресурсов)
7. [Обработка ошибок](#обработка-ошибок)
8. [Практические сценарии](#практические-сценарии)

---

## Введение

Automation-Monitor API предоставляет REST интерфейс для мониторинга и управления Docker контейнерами с автоматизациями. API позволяет:

- Мониторить состояние всех автоматизаций в реальном времени
- Управлять жизненным циклом контейнеров (запуск, остановка, перезапуск)
- Просматривать логи контейнеров в реальном времени
- Отслеживать потребление ресурсов (CPU, память, сеть)
- Получать информацию о MQTT статусах автоматизаций

---

## Начало работы

### Требования

- Доступ к серверу по адресу `10.0.20.102` в локальной сети
- Учетные данные: username `admin`, password `test`
- Утилита `curl` для работы через командную строку
- Опционально: `jq` для форматирования JSON ответов

### Базовая команда

Все запросы требуют авторизации. Базовый формат команды:

```bash
curl -u admin:test http://10.0.20.102:8080/api/ENDPOINT
```

### Проверка доступности API

Первый запрос - проверка работоспособности:

```bash
curl -u admin:test http://10.0.20.102:8080/api/health
```

**Ответ:**

```json
{
  "service": "automation-monitor",
  "status": "healthy",
  "uptime_seconds": 4271,
  "docker_connected": true,
  "mqtt_connected": true,
  "tracked_automations": 10,
  "timestamp": "2025-12-02T13:46:46.921937"
}
```

**Расшифровка полей:**

- `service` - название сервиса
- `status` - статус здоровья системы (`healthy` или `degraded`)
- `uptime_seconds` - время работы монитора в секундах
- `docker_connected` - подключение к Docker API (true/false)
- `mqtt_connected` - подключение к MQTT брокеру (true/false)
- `tracked_automations` - количество отслеживаемых автоматизаций
- `timestamp` - время формирования ответа

**Интерпретация:**

- `status: "healthy"` - все системы работают нормально
- `status: "degraded"` - Docker или MQTT недоступны
- Если Docker или MQTT disconnected - требуется проверка инфраструктуры

---

## Мониторинг системы

### Получение списка всех автоматизаций

**Команда:**

```bash
curl -u admin:test http://10.0.20.102:8080/api/automations
```

**Ответ (краткая версия):**

```json
{
  "total": 11,
  "running": 9,
  "stopped": 2,
  "automations": [...]
}
```

**Получить только сводку:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '{total, running, stopped}'
```

**Вывод:**

```json
{
  "total": 11,
  "running": 9,
  "stopped": 2
}
```

**Получить список названий автоматизаций:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[].automation_name'
```

**Вывод:**

```
"monitor"
"main-street/windows-newyear-light"
"main/vadim-bedroom/bed-light-motion"
"main/conservatory/sunset_light_auto"
"main/kitchen/motion_light"
...
```

### Детальная информация об автоматизации

**Полный ответ для одной автоматизации:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[0]'
```

**Вывод:**

```json
{
  "container_name": "automation-monitor",
  "automation_name": "monitor",
  "container": {
    "id": "8e9ecd152f46",
    "status": "running",
    "image": "automation-automation-monitor:latest",
    "created": "2025-12-02T12:35:31.85234534Z",
    "started": "2025-12-02T12:35:35.176270738Z",
    "uptime_seconds": 4282
  },
  "mqtt": {
    "status": {
      "status": "running",
      "uptime": 4260,
      "triggers_count": 653,
      "errors_count": 0,
      "last_trigger": "2025-12-02T13:45:56.258551",
      "timestamp": "2025-12-02T13:46:36.366815"
    },
    "ready": null,
    "config": null,
    "last_seen": "2025-12-02T13:46:36.367306"
  },
  "health": {
    "overall": "healthy",
    "docker_running": true,
    "mqtt_responding": true
  }
}
```

**Расшифровка секций:**

**container** - информация о Docker контейнере:
- `id` - короткий ID контейнера
- `status` - статус контейнера (`running`, `exited`, `restarting`, etc.)
- `image` - используемый Docker образ
- `created` - время создания контейнера
- `started` - время последнего запуска
- `uptime_seconds` - время работы в секундах

**mqtt** - информация из MQTT топиков:
- `status.status` - статус автоматизации (`running`, `stopped`, `error`)
- `status.uptime` - uptime автоматизации в секундах
- `status.triggers_count` - количество срабатываний триггеров
- `status.errors_count` - количество ошибок
- `status.last_trigger` - время последнего срабатывания
- `last_seen` - время последнего MQTT сообщения

**health** - агрегированная информация о здоровье:
- `overall` - общий статус (`healthy`, `degraded`, `offline`, `unhealthy`)
- `docker_running` - контейнер запущен (true/false)
- `mqtt_responding` - автоматизация отвечает в MQTT (true/false)

**Интерпретация статусов health.overall:**

- `healthy` - контейнер работает И отвечает в MQTT
- `degraded` - контейнер работает, но НЕ отвечает в MQTT (проблема с автоматизацией)
- `offline` - контейнер остановлен
- `unhealthy` - неизвестное состояние (требуется проверка)

### Получение информации о конкретной автоматизации

**По имени автоматизации:**

```bash
curl -u admin:test http://10.0.20.102:8080/api/automations/monitor
```

**По имени контейнера:**

```bash
curl -u admin:test http://10.0.20.102:8080/api/automations/automation-monitor
```

**Оба запроса вернут одинаковый результат** - полную информацию об автоматизации monitor.

**Получить только статус здоровья:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/monitor | jq '.health'
```

**Вывод:**

```json
{
  "overall": "healthy",
  "docker_running": true,
  "mqtt_responding": true
}
```

**Получить количество триггеров:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/monitor | jq '.mqtt.status.triggers_count'
```

**Вывод:**

```
653
```

### Фильтрация и поиск автоматизаций

**Найти все проблемные автоматизации (не healthy):**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | select(.health.overall != "healthy") | {name: .automation_name, health: .health.overall}'
```

**Вывод (если есть проблемные):**

```json
{
  "name": "main/kitchen/motion_light",
  "health": "degraded"
}
{
  "name": "main/bedroom/light_auto",
  "health": "offline"
}
```

**Найти автоматизации с ошибками:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | select(.mqtt.status.errors_count > 0) | {name: .automation_name, errors: .mqtt.status.errors_count}'
```

**Найти остановленные контейнеры:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | select(.container.status != "running") | .container_name'
```

**Вывод:**

```
"automation-main-bedroom-light"
"automation-guest-motion-sensor"
```

**Получить uptime всех автоматизаций:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | {name: .automation_name, uptime_hours: (.container.uptime_seconds / 3600 | floor)}'
```

**Вывод:**

```json
{"name": "monitor", "uptime_hours": 1}
{"name": "main-street/windows-newyear-light", "uptime_hours": 1}
{"name": "main/vadim-bedroom/bed-light-motion", "uptime_hours": 1}
...
```

---

## Управление автоматизациями

### Перезапуск автоматизации

**Команда:**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-street-windows-newyear-light/restart
```

**Ответ при успехе:**

```json
{
  "success": true,
  "action": "restart",
  "container_name": "automation-main-street-windows-newyear-light",
  "message": "Контейнер перезапущен",
  "new_status": "running"
}
```

**Когда использовать:**

- Автоматизация зависла или работает некорректно
- После изменения конфигурации (хотя обычно пересоздается контейнер)
- Для применения обновлений в памяти

**Важно:** Нельзя перезапустить сам monitor через API (защита от случайного отключения мониторинга).

**Попытка перезапустить monitor:**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/monitor/restart
```

**Ответ:**

```json
{
  "detail": "Нельзя рестартить монитор через API"
}
```

HTTP код: 400

### Остановка автоматизации

**Команда:**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-street-windows-newyear-light/stop
```

**Ответ:**

```json
{
  "success": true,
  "action": "stop",
  "container_name": "automation-main-street-windows-newyear-light",
  "message": "Контейнер остановлен",
  "new_status": "exited"
}
```

**Когда использовать:**

- Временное отключение автоматизации (например, на время ремонта)
- Для экономии ресурсов (отключение неиспользуемых автоматизаций)
- Перед ручным обслуживанием оборудования

**Проверка остановки:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-street-windows-newyear-light | jq '{status: .container.status, health: .health.overall}'
```

**Вывод после остановки:**

```json
{
  "status": "exited",
  "health": "offline"
}
```

**Попытка остановить уже остановленный контейнер:**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-street-windows-newyear-light/stop
```

**Ответ:**

```json
{
  "success": false,
  "action": "stop",
  "container_name": "automation-main-street-windows-newyear-light",
  "message": "Контейнер не запущен (статус: exited)",
  "new_status": null
}
```

Это не ошибка, просто информация что контейнер уже остановлен.

### Запуск остановленной автоматизации

**Команда:**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-street-windows-newyear-light/start
```

**Ответ:**

```json
{
  "success": true,
  "action": "start",
  "container_name": "automation-main-street-windows-newyear-light",
  "message": "Контейнер запущен",
  "new_status": "running"
}
```

**Проверка запуска:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-street-windows-newyear-light | jq '{status: .container.status, health: .health.overall}'
```

**Вывод сразу после запуска:**

```json
{
  "status": "running",
  "health": "degraded"
}
```

**Вывод через 10-20 секунд:**

```json
{
  "status": "running",
  "health": "healthy"
}
```

**Почему сначала degraded?** После запуска контейнеру нужно время чтобы:
1. Запустить Python процесс
2. Подключиться к MQTT
3. Отправить первый status message

Обычно это занимает 5-15 секунд.

### Полный цикл управления контейнером

**Сценарий: временное отключение и включение автоматизации**

**Шаг 1: Проверить текущий статус**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-kitchen-motion-light | jq '{status: .container.status, health: .health.overall, uptime: .container.uptime_seconds}'
```

**Вывод:**

```json
{
  "status": "running",
  "health": "healthy",
  "uptime": 7200
}
```

**Шаг 2: Остановить**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-kitchen-motion-light/stop
```

**Шаг 3: Подождать и проверить остановку**

```bash
sleep 2
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-kitchen-motion-light | jq .health.overall
```

**Вывод:**

```
"offline"
```

**Шаг 4: Запустить обратно**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-kitchen-motion-light/start
```

**Шаг 5: Дать время на инициализацию**

```bash
sleep 15
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-kitchen-motion-light | jq .health.overall
```

**Вывод:**

```
"healthy"
```

---

## Просмотр логов

### Просмотр логов контейнера в реальном времени

Логи передаются через SSE (Server-Sent Events) - это stream который постоянно открыт.

**Базовая команда:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=10"
```

**Вывод (формат SSE):**

```
event: log
data: 2025-12-02T13:55:21.078698738Z 2025-12-02 13:55:21 - monitor - INFO - Checking containers status

event: log
data: 2025-12-02T13:55:21.079711409Z 2025-12-02 13:55:21 - urllib3.connectionpool - DEBUG - http://localhost:None "GET /v1.47/images/3ea3999ed8a154055c3492b04126cdbe9f91e7de7a7aa7ebd11e2107d3defdbc/json HTTP/1.1" 200 None

event: log
data: 2025-12-02T13:55:21.081153785Z 2025-12-02 13:55:21 - monitor - INFO - All automations healthy

event: ping
data:

event: log
data: 2025-12-02T13:55:26.076530252Z 2025-12-02 13:55:26 - monitor - INFO - Checking containers status
```

**Формат события:**

- `event: log` - событие лога
- `data: TIMESTAMP MESSAGE` - строка лога с временной меткой Docker
- `event: ping` - keepalive событие (каждую секунду)

**Параметры:**

- `lines` - сколько последних строк показать перед началом stream (default: 100)

**Примеры использования:**

**Показать последние 5 строк и следить за новыми:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=5"
```

**Показать последние 100 строк (default):**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor"
```

**Только новые логи (без истории):**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=0"
```

**Прервать просмотр:** Ctrl+C

### Фильтрация логов

**Показать только строки с ERROR:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=100" | grep "ERROR"
```

**Показать только строки с определенным словом:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=50" | grep "MQTT"
```

**Извлечь только текст логов (без SSE заголовков):**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=20" | grep "^data:" | sed 's/^data: //'
```

**Вывод:**

```
2025-12-02T13:55:21.078698738Z 2025-12-02 13:55:21 - monitor - INFO - Checking containers
2025-12-02T13:55:21.079711409Z 2025-12-02 13:55:21 - monitor - INFO - All healthy
...
```

### Просмотр логов с временными ограничениями

**Просмотреть логи 30 секунд и выйти:**

```bash
timeout 30 curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=10"
```

**Просмотреть логи 5 минут:**

```bash
timeout 300 curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-monitor?lines=20"
```

### Логи несуществующего контейнера

**Команда:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/nonexistent-container"
```

**Ответ:**

```json
{
  "detail": "Контейнер 'nonexistent-container' не найден"
}
```

HTTP код: 404

---

## Мониторинг ресурсов

### Статистика одного контейнера

**Команда:**

```bash
curl -u admin:test http://10.0.20.102:8080/api/stats/automation-monitor
```

**Ответ:**

```json
{
  "container_name": "automation-monitor",
  "timestamp": "2025-12-02T12:57:28.031246",
  "cpu": {
    "percent": 0.16,
    "cores": 3
  },
  "memory": {
    "used_mb": 39.11,
    "limit_mb": 8192.0,
    "percent": 0.48
  },
  "network": {
    "rx_mb": 0.01,
    "tx_mb": 0.0
  },
  "block_io": {
    "read_mb": 0.0,
    "write_mb": 0.2
  }
}
```

**Расшифровка метрик:**

**CPU:**
- `percent` - процент использования CPU (от 0 до 100 * количество ядер)
- `cores` - количество доступных CPU ядер

Пример: `percent: 150` означает использование 1.5 ядер из доступных

**Memory:**
- `used_mb` - использовано памяти в мегабайтах
- `limit_mb` - лимит памяти контейнера в МБ
- `percent` - процент использования от лимита

**Network (accumulated с момента запуска контейнера):**
- `rx_mb` - получено данных в МБ
- `tx_mb` - отправлено данных в МБ

**Block I/O (accumulated с момента запуска):**
- `read_mb` - прочитано с диска в МБ
- `write_mb` - записано на диск в МБ

**Важно:** Сбор статистики занимает ~1 секунду на контейнер (ограничение Docker API).

**Получить только CPU:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats/automation-monitor | jq '.cpu'
```

**Вывод:**

```json
{
  "percent": 0.16,
  "cores": 3
}
```

**Получить использование памяти:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats/automation-monitor | jq '.memory.used_mb'
```

**Вывод:**

```
39.11
```

### Статистика всех контейнеров

**Команда:**

```bash
curl -u admin:test http://10.0.20.102:8080/api/stats
```

**Ответ (сокращенно):**

```json
{
  "timestamp": "2025-12-02T12:57:20.116634",
  "total": 9,
  "containers": [
    {
      "container_name": "automation-monitor",
      "timestamp": "2025-12-02T12:57:20.116497",
      "cpu": {"percent": 0.16, "cores": 3},
      "memory": {"used_mb": 38.93, "limit_mb": 8192.0, "percent": 0.48},
      "network": {"rx_mb": 0.01, "tx_mb": 0.0},
      "block_io": {"read_mb": 0.0, "write_mb": 0.2}
    },
    {
      "container_name": "automation-main-street-windows-newyear-light",
      "timestamp": "2025-12-02T12:57:21.234567",
      "cpu": {"percent": 0.08, "cores": 3},
      "memory": {"used_mb": 35.22, "limit_mb": 8192.0, "percent": 0.43},
      "network": {"rx_mb": 0.005, "tx_mb": 0.002},
      "block_io": {"read_mb": 0.0, "write_mb": 0.15}
    }
  ]
}
```

**Важно:** Для 9 контейнеров запрос займет ~17 секунд (по 1-2 сек на каждый). Для real-time мониторинга используйте streaming endpoint.

**Получить список контейнеров по использованию CPU:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '.containers | sort_by(.cpu.percent) | reverse | .[] | {name: .container_name, cpu: .cpu.percent}'
```

**Вывод:**

```json
{"name": "automation-main-kitchen-motion", "cpu": 0.23}
{"name": "automation-monitor", "cpu": 0.16}
{"name": "automation-main-bedroom-light", "cpu": 0.09}
...
```

**Получить список по использованию памяти:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '.containers | sort_by(.memory.used_mb) | reverse | .[] | {name: .container_name, memory_mb: .memory.used_mb}'
```

**Найти контейнеры с высоким использованием памяти (>50MB):**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '.containers[] | select(.memory.used_mb > 50) | {name: .container_name, memory: .memory.used_mb}'
```

**Подсчитать общее использование памяти:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '[.containers[].memory.used_mb] | add'
```

**Вывод:**

```
342.67
```

(суммарно все контейнеры используют ~343 МБ памяти)

### Real-time мониторинг ресурсов (streaming)

Для построения графиков и real-time дашбордов используется SSE streaming.

**Команда:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/stats/stream?interval=5"
```

**Параметры:**

- `interval` - интервал обновления в секундах (1-60, default: 2)

**Вывод (формат SSE):**

```
event: stats
data: {"timestamp":"2025-12-02T13:58:34.666054","total":9,"containers":[{"container_name":"automation-monitor","cpu":{"percent":0.16,"cores":3},"memory":{"used_mb":39.11,"percent":0.48},...}]}

event: stats
data: {"timestamp":"2025-12-02T13:58:39.782341","total":9,"containers":[{"container_name":"automation-monitor","cpu":{"percent":0.18,"cores":3},"memory":{"used_mb":39.15,"percent":0.48},...}]}
```

Каждые 5 секунд приходит новое событие `stats` со статистикой всех контейнеров.

**Рекомендуемые интервалы:**

- `interval=2` - для детального мониторинга (каждые 2 секунды)
- `interval=5` - для обычных дашбордов (каждые 5 секунд)
- `interval=10` - для фоновой статистики (каждые 10 секунд)
- `interval=30` - для легковесного мониторинга (каждые 30 секунд)

**Извлечь данные из stream:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/stats/stream?interval=5" | grep "^data:" | sed 's/^data: //' | jq '.containers[0].cpu.percent'
```

Это покажет CPU первого контейнера каждые 5 секунд.

**Остановить streaming:** Ctrl+C

**Неправильный интервал:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/stats/stream?interval=invalid"
```

**Ответ:**

```json
{
  "detail": [
    {
      "type": "int_parsing",
      "loc": ["query", "interval"],
      "msg": "Input should be a valid integer, unable to parse string as an integer",
      "input": "invalid"
    }
  ]
}
```

HTTP код: 422 (Validation Error)

---

## Обработка ошибок

### HTTP статус коды

API использует стандартные HTTP коды:

- **200 OK** - запрос выполнен успешно
- **401 Unauthorized** - требуется авторизация или неверные credentials
- **404 Not Found** - ресурс не найден
- **400 Bad Request** - некорректный запрос (например, попытка рестарта monitor)
- **422 Unprocessable Entity** - ошибка валидации параметров
- **500 Internal Server Error** - внутренняя ошибка сервера

### Формат ошибок

Все ошибки возвращаются в формате:

```json
{
  "detail": "Описание ошибки"
}
```

или для validation errors:

```json
{
  "detail": [
    {
      "type": "error_type",
      "loc": ["location", "of", "error"],
      "msg": "Human readable message",
      "input": "user_input"
    }
  ]
}
```

### Примеры ошибок

**Нет авторизации:**

```bash
curl http://10.0.20.102:8080/api/health
```

**Ответ:**

```json
{
  "detail": "Not authenticated"
}
```

HTTP код: 401

---

**Неправильный пароль:**

```bash
curl -u admin:wrongpassword http://10.0.20.102:8080/api/health
```

**Ответ:**

```json
{
  "detail": "Неверные учетные данные"
}
```

HTTP код: 401

---

**Автоматизация не найдена:**

```bash
curl -u admin:test http://10.0.20.102:8080/api/automations/nonexistent
```

**Ответ:**

```json
{
  "detail": "Автоматизация 'nonexistent' не найдена"
}
```

HTTP код: 404

---

**Контейнер не найден (для stats):**

```bash
curl -u admin:test http://10.0.20.102:8080/api/stats/nonexistent
```

**Ответ:**

```json
{
  "detail": "Контейнер 'nonexistent' не найден или не запущен"
}
```

HTTP код: 404

---

**Попытка рестарта monitor:**

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/monitor/restart
```

**Ответ:**

```json
{
  "detail": "Нельзя рестартить монитор через API"
}
```

HTTP код: 400

---

**Контейнер не в нужном состоянии:**

```bash
# Попытка остановить уже остановленный контейнер
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-test/stop
```

**Ответ:**

```json
{
  "success": false,
  "action": "stop",
  "container_name": "automation-test",
  "message": "Контейнер не запущен (статус: exited)",
  "new_status": null
}
```

HTTP код: 200 (это не ошибка, а информация)

---

## Практические сценарии

### Сценарий 1: Ежедневная проверка здоровья системы

**Цель:** Убедиться что все автоматизации работают

```bash
# Проверить общее состояние
curl -u admin:test -s http://10.0.20.102:8080/api/health | jq '{status, docker: .docker_connected, mqtt: .mqtt_connected, automations: .tracked_automations}'
```

**Ожидаемый вывод:**

```json
{
  "status": "healthy",
  "docker": true,
  "mqtt": true,
  "automations": 10
}
```

```bash
# Проверить сводку автоматизаций
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '{total, running, stopped}'
```

**Ожидаемый вывод:**

```json
{
  "total": 11,
  "running": 9,
  "stopped": 2
}
```

```bash
# Найти проблемные автоматизации
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | select(.health.overall != "healthy") | {name: .automation_name, health: .health.overall, status: .container.status}'
```

**Если все хорошо:** пустой вывод

**Если есть проблемы:**

```json
{
  "name": "main/kitchen/motion_light",
  "health": "degraded",
  "status": "running"
}
```

Action: Проверить логи этой автоматизации

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-main-kitchen-motion_light?lines=50" | grep -i error
```

### Сценарий 2: Расследование проблемы с автоматизацией

**Проблема:** Автоматизация не срабатывает

**Шаг 1: Проверить статус**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-kitchen-motion_light | jq '{container_status: .container.status, health: .health.overall, mqtt_status: .mqtt.status.status}'
```

**Возможные результаты:**

**Вариант А: Контейнер остановлен**

```json
{
  "container_status": "exited",
  "health": "offline",
  "mqtt_status": null
}
```

Action: Запустить контейнер

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-kitchen-motion_light/start
```

---

**Вариант Б: Контейнер работает, но не отвечает в MQTT**

```json
{
  "container_status": "running",
  "health": "degraded",
  "mqtt_status": null
}
```

Action: Проверить логи на ошибки MQTT

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-main-kitchen-motion_light?lines=100" | grep -i "mqtt\|error\|exception"
```

Если видим проблемы с MQTT → перезапустить:

```bash
curl -u admin:test -X POST http://10.0.20.102:8080/api/control/automation-main-kitchen-motion_light/restart
```

---

**Вариант В: Все работает, но автоматизация не срабатывает**

```json
{
  "container_status": "running",
  "health": "healthy",
  "mqtt_status": "running"
}
```

**Шаг 2: Проверить триггеры**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations/automation-main-kitchen-motion_light | jq '.mqtt.status | {triggers: .triggers_count, errors: .errors_count, last_trigger: .last_trigger}'
```

**Вывод:**

```json
{
  "triggers": 0,
  "errors": 0,
  "last_trigger": null
}
```

Триггеры не срабатывают → проблема в логике или сенсорах, не в контейнере.

**Шаг 3: Смотреть логи в реальном времени**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-main-kitchen-motion_light?lines=20"
```

Наблюдать за логами и триггерить событие вручную (например, пройти перед датчиком).

### Сценарий 3: Мониторинг производительности

**Цель:** Найти автоматизации с высоким потреблением ресурсов

**Получить топ-3 по CPU:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '.containers | sort_by(.cpu.percent) | reverse | .[0:3] | .[] | {name: .container_name, cpu: .cpu.percent, memory_mb: .memory.used_mb}'
```

**Вывод:**

```json
{"name": "automation-main-conservatory-climate", "cpu": 0.45, "memory_mb": 52.3}
{"name": "automation-monitor", "cpu": 0.18, "memory_mb": 39.1}
{"name": "automation-main-kitchen-motion", "cpu": 0.12, "memory_mb": 35.8}
```

**Получить топ-3 по памяти:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '.containers | sort_by(.memory.used_mb) | reverse | .[0:3] | .[] | {name: .container_name, memory_mb: .memory.used_mb, memory_percent: .memory.percent}'
```

**Проверить общее потребление:**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '{total_memory_mb: ([.containers[].memory.used_mb] | add), avg_cpu: ([.containers[].cpu.percent] | add / length)}'
```

**Вывод:**

```json
{
  "total_memory_mb": 342.67,
  "avg_cpu": 0.15
}
```

### Сценарий 4: Массовый перезапуск автоматизаций

**Цель:** Перезапустить все автоматизации после обновления системы

**Получить список всех контейнеров (кроме monitor):**

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq -r '.automations[] | select(.automation_name != "monitor") | .container_name'
```

**Вывод:**

```
automation-main-street-windows-newyear-light
automation-main-vadim-bedroom-bed-light-motion
automation-main-conservatory-sunset_light_auto
...
```

**Создать скрипт для перезапуска:**

```bash
#!/bin/bash
# restart_all.sh

for container in $(curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq -r '.automations[] | select(.automation_name != "monitor") | .container_name'); do
  echo "Restarting $container..."
  curl -u admin:test -X POST -s "http://10.0.20.102:8080/api/control/$container/restart" | jq -r '.message'
  sleep 2
done

echo "All containers restarted!"
```

**Запустить:**

```bash
chmod +x restart_all.sh
./restart_all.sh
```

**Вывод:**

```
Restarting automation-main-street-windows-newyear-light...
Контейнер перезапущен
Restarting automation-main-vadim-bedroom-bed-light-motion...
Контейнер перезапущен
...
All containers restarted!
```

### Сценарий 5: Continuous monitoring в терминале

**Цель:** Постоянно отслеживать статус в терминале

**Создать скрипт мониторинга:**

```bash
#!/bin/bash
# monitor.sh

while true; do
  clear
  echo "=== Automation Monitor Dashboard ==="
  echo "Time: $(date)"
  echo ""

  echo "System Health:"
  curl -u admin:test -s http://10.0.20.102:8080/api/health | jq '{status, docker: .docker_connected, mqtt: .mqtt_connected, automations: .tracked_automations}'
  echo ""

  echo "Automations Summary:"
  curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '{total, running, stopped}'
  echo ""

  echo "Unhealthy Automations:"
  curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | select(.health.overall != "healthy") | {name: .automation_name, health: .health.overall}'
  echo ""

  echo "Top 3 CPU Users:"
  curl -u admin:test -s http://10.0.20.102:8080/api/stats | jq '.containers | sort_by(.cpu.percent) | reverse | .[0:3] | .[] | {name: .container_name, cpu: .cpu.percent}'

  sleep 10
done
```

**Запустить:**

```bash
chmod +x monitor.sh
./monitor.sh
```

Экран будет обновляться каждые 10 секунд с актуальной информацией.

### Сценарий 6: Поиск автоматизаций с ошибками

**Цель:** Найти все автоматизации у которых были ошибки

```bash
curl -u admin:test -s http://10.0.20.102:8080/api/automations | jq '.automations[] | select(.mqtt.status.errors_count > 0) | {name: .automation_name, errors: .mqtt.status.errors_count, last_trigger: .mqtt.status.last_trigger}'
```

**Вывод (если есть ошибки):**

```json
{
  "name": "main/conservatory/climate",
  "errors": 3,
  "last_trigger": "2025-12-02T12:30:45.123456"
}
{
  "name": "main/bedroom/light",
  "errors": 1,
  "last_trigger": "2025-12-02T13:15:22.654321"
}
```

**Для каждой проблемной автоматизации смотреть логи:**

```bash
curl -u admin:test "http://10.0.20.102:8080/api/logs/automation-main-conservatory-climate?lines=100" | grep -i error
```

### Сценарий 7: Экспорт данных для анализа

**Цель:** Сохранить snapshot системы для анализа

**Создать полный snapshot:**

```bash
#!/bin/bash
# snapshot.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_DIR="snapshots/$TIMESTAMP"
mkdir -p "$SNAPSHOT_DIR"

echo "Creating snapshot in $SNAPSHOT_DIR..."

# Health
curl -u admin:test -s http://10.0.20.102:8080/api/health > "$SNAPSHOT_DIR/health.json"

# All automations
curl -u admin:test -s http://10.0.20.102:8080/api/automations > "$SNAPSHOT_DIR/automations.json"

# Stats
curl -u admin:test -s http://10.0.20.102:8080/api/stats > "$SNAPSHOT_DIR/stats.json"

echo "Snapshot created!"
echo "Files:"
ls -lh "$SNAPSHOT_DIR"
```

**Запустить:**

```bash
chmod +x snapshot.sh
./snapshot.sh
```

**Вывод:**

```
Creating snapshot in snapshots/20251202_135530...
Snapshot created!
Files:
-rw-r--r-- 1 user user  523 Dec  2 13:55 health.json
-rw-r--r-- 1 user user  45K Dec  2 13:55 automations.json
-rw-r--r-- 1 user user  12K Dec  2 13:56 stats.json
```

Теперь можно анализировать данные локально:

```bash
jq '.automations[] | {name: .automation_name, health: .health.overall}' snapshots/20251202_135530/automations.json
```

---

## Советы и best practices

### Производительность

1. **Не опрашивайте /api/stats слишком часто**
   - Одна статистика контейнера = ~1 секунда
   - Для 10 контейнеров = ~10-20 секунд
   - Используйте `/api/stats/stream` для real-time

2. **Используйте кэширование на клиенте**
   - `/api/automations` меняется редко → кэш на 30-60 сек
   - `/api/health` можно кэшировать на 10 сек
   - `/api/stats` НЕ кэшировать или кэш на 5 сек

3. **Параллельные запросы**
   - Если нужна информация о нескольких автоматизациях, делайте параллельные запросы
   - Пример: `curl URL1 & curl URL2 & wait`

### Безопасность

1. **Не храните пароль в истории команд**
   - Создайте `.netrc` файл или используйте переменные окружения
   - Пример: `export API_AUTH="admin:test"` затем `curl -u $API_AUTH URL`

2. **Используйте HTTPS в production**
   - Сейчас HTTP для локальной сети - это OK
   - Для доступа извне обязательно настройте HTTPS (nginx/traefik)

3. **Ограничьте доступ на уровне сети**
   - Firewall правила для порта 8080
   - VPN для доступа извне

### Мониторинг

1. **Проверяйте health endpoint регулярно**
   - Каждые 30-60 секунд
   - Alerting если `status != "healthy"`

2. **Отслеживайте unhealthy автоматизации**
   - Ежеминутная проверка списка
   - Уведомления если `health.overall != "healthy"`

3. **Следите за ошибками в MQTT**
   - Проверка `mqtt.status.errors_count`
   - Alerting если ошибки растут

### Troubleshooting

**Проблема:** API не отвечает

**Решение:**
1. Проверить что контейнер monitor запущен (на сервере)
2. Проверить доступность сервера: `ping 10.0.20.102`
3. Проверить порт: `telnet 10.0.20.102 8080`

---

**Проблема:** 401 Unauthorized с правильными credentials

**Решение:**
1. Проверить что credentials точно правильные (копипаста без пробелов)
2. Убедиться что переменные окружения установлены в контейнере
3. Проверить логи monitor на наличие `AUTH_PASSWORD не задан`

---

**Проблема:** Медленные ответы от /api/stats

**Решение:**
Это нормально - Docker API собирает статистику ~1-2 сек на контейнер. Используйте:
- `/api/stats/{container}` для одного контейнера
- `/api/stats/stream` для real-time мониторинга

---

**Проблема:** SSE stream обрывается

**Решение:**
1. Проверить настройки timeout в reverse proxy (если есть)
2. Использовать reconnection logic на клиенте
3. Проверить что контейнер monitor не перезапускается

---

## Заключение

Automation-Monitor API предоставляет мощный и удобный интерфейс для управления автоматизациями. Основные возможности:

✅ Полный контроль над контейнерами (start/stop/restart)
✅ Мониторинг здоровья в реальном времени
✅ Просмотр логов через SSE streaming
✅ Детальная статистика ресурсов
✅ Интеграция с MQTT для статусов автоматизаций

Для большинства задач достаточно нескольких основных endpoints:
- `/api/health` - общее состояние
- `/api/automations` - список автоматизаций
- `/api/control/{name}/restart` - перезапуск
- `/api/logs/{name}` - просмотр логов

**Документация актуальна на:** 2025-12-02

**Для вопросов и поддержки:** обратитесь к команде разработки

---

*User Guide generated for Automation-Monitor API v1.0.0*
