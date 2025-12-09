# Frigate NVR API Documentation

Полная документация по работе с API Frigate NVR на основе реального инстанса `http://10.0.10.3:5000`

## Table of Contents
- [Authentication](#authentication)
- [Camera Streams](#camera-streams)
- [Events API](#events-api)
- [Statistics & Monitoring](#statistics--monitoring)
- [Advanced Features](#advanced-features)
- [Performance Optimization](#performance-optimization)
- [Common Patterns](#common-patterns)

---

## Authentication

Frigate использует cookie-based authentication с настройками из конфига:
- Cookie name: `frigate_token`
- Session length: 86400 секунд (24 часа)
- Refresh time: 43200 секунд (12 часов)

```python
import requests

session = requests.Session()
# После успешной аутентификации cookie автоматически сохраняется
response = session.post('http://10.0.10.3:5000/api/login',
    json={'username': 'admin', 'password': 'your_password'})
```

---

## Camera Streams

### MJPEG Stream (для live view)

**Endpoint:** `GET /api/{camera_name}`

**Query Parameters:**
- `fps=5` - ограничить FPS стрима
- `h=360` - высота изображения (автоматически рассчитывается ширина)
- `bbox=1` - показывать bounding boxes объектов
- `timestamp=1` - показывать timestamp
- `zones=1` - показывать зоны детекции
- `mask=1` - показывать маски движения
- `motion=1` - показывать области движения
- `regions=1` - показывать регионы для детекции

```bash
# Базовый стрим
curl http://10.0.10.3:5000/api/cam-doorbell

# Стрим с низким разрешением и overlay
curl "http://10.0.10.3:5000/api/cam-doorbell?h=360&bbox=1&timestamp=1"
```

**Content-Type:** `multipart/x-mixed-replace;boundary=frame`

**Важно:** Это НЕ обычный HTTP response. Каждый кадр отправляется как отдельная часть multipart сообщения:

```
--frame
Content-Type: image/jpeg
Content-Length: 52341

[JPEG binary data]
--frame
Content-Type: image/jpeg
Content-Length: 51892

[JPEG binary data]
--frame
...
```

#### Использование в HTML:
```html
<img src="http://10.0.10.3:5000/api/cam-doorbell?h=480&bbox=1" />
```

#### Использование в Python (streaming):
```python
import requests
import cv2
import numpy as np

response = requests.get('http://10.0.10.3:5000/api/cam-doorbell', stream=True)
bytes_data = bytes()

for chunk in response.iter_content(chunk_size=1024):
    bytes_data += chunk
    a = bytes_data.find(b'\xff\xd8')  # JPEG start
    b = bytes_data.find(b'\xff\xd9')  # JPEG end

    if a != -1 and b != -1:
        jpg = bytes_data[a:b+2]
        bytes_data = bytes_data[b+2:]

        # Decode JPEG
        frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
        cv2.imshow('Frigate', frame)
        if cv2.waitKey(1) == 27:  # ESC
            break
```

### Static Snapshots

**Endpoint:** `GET /api/{camera_name}/latest.jpg`

Возвращает последний обработанный кадр с камеры.

**Query Parameters:** (те же что и для MJPEG)

```bash
# Высокое разрешение для детального просмотра
curl http://10.0.10.3:5000/api/cam-doorbell/latest.jpg -o snapshot.jpg

# Низкое разрешение для thumbnail (135KB vs ~500KB)
curl "http://10.0.10.3:5000/api/cam-doorbell/latest.jpg?h=360" -o thumbnail.jpg
```

**Рекомендация:** Используйте для grid с множеством камер, обновляя каждые 1-3 секунды.

### Best Object Snapshot

**Endpoint:** `GET /api/{camera_name}/{label}/best.jpg`

Возвращает лучший снимок обнаруженного объекта (с наивысшим score).

**Labels:** `person`, `car`, `dog`, `cat`, и др.

**Query Parameters:**
- `h=300` - высота изображения
- `crop=1` - обрезать до bounding box объекта
- `quality=70` - качество JPEG (0-100)

```bash
# Лучший снимок человека с камеры
curl "http://10.0.10.3:5000/api/cam-doorbell/person/best.jpg?crop=1&h=200" -o best_person.jpg

# Лучший снимок машины
curl "http://10.0.10.3:5000/api/cam-parking-secondary/car/best.jpg" -o best_car.jpg
```

---

## Events API

### Get Events

**Endpoint:** `GET /api/events`

**Query Parameters:**
- `limit=100` - максимальное количество событий (default: 100)
- `cameras=cam1,cam2` - фильтр по камерам (comma-separated)
- `labels=person,car` - фильтр по типу объекта
- `zones=entry,parking` - фильтр по зонам
- `after=1764681000` - события после timestamp
- `before=1764681999` - события до timestamp
- `has_clip=1` - только события с видео клипом
- `has_snapshot=1` - только события со снимком
- `include_thumbnails=0` - не включать base64 thumbnails (экономия трафика)

```bash
# Последние 10 событий
curl "http://10.0.10.3:5000/api/events?limit=10"

# События с людьми за последний час
curl "http://10.0.10.3:5000/api/events?labels=person&after=$(date -d '1 hour ago' +%s)"

# Только события в зоне парковки с видео
curl "http://10.0.10.3:5000/api/events?zones=parking&has_clip=1"
```

**Response structure:**
```json
{
  "id": "1764681223.810482-moeodu",
  "camera": "cam-doorbell",
  "label": "person",
  "zones": ["entry"],
  "start_time": 1764681223.810482,
  "end_time": 1764681226.615944,
  "has_clip": true,
  "has_snapshot": false,
  "top_score": 0.82421875,
  "data": {
    "box": [0.1375, 0.5222222222222223, 0.134375, 0.4583333333333333],
    "region": [0.0, 0.3055555555555556, 0.390625, 0.6944444444444444],
    "score": 0.82421875,
    "attributes": [],
    "type": "object",
    "max_severity": "alert",
    "path_data": [
      [[0.2047, 0.9806], 1764681223.810482],
      [[0.3008, 0.9750], 1764681224.420569],
      [[0.4031, 0.9750], 1764681225.005735]
    ]
  }
}
```

**Важные поля:**
- `box` - [x_center, y_center, width, height] в относительных координатах (0.0-1.0)
- `region` - область где искался объект
- `path_data` - массив траектории движения: [[x, y], timestamp]
- `max_severity` - "alert" или "detection" (зависит от настроек зон)

### Get Event Details

**Endpoint:** `GET /api/events/{event_id}`

```bash
curl http://10.0.10.3:5000/api/events/1764681223.810482-moeodu
```

### Delete Event

**Endpoint:** `DELETE /api/events/{event_id}`

Удаляет событие и связанные медиа (клипы, снимки).

```bash
curl -X DELETE http://10.0.10.3:5000/api/events/1764681223.810482-moeodu
```

### Events Summary

**Endpoint:** `GET /api/events/summary`

Группирует события по камерам, меткам и датам.

```bash
curl http://10.0.10.3:5000/api/events/summary
```

**Response:**
```json
[
  {
    "camera": "cam-parking-secondary",
    "label": "car",
    "sub_label": null,
    "day": "2025-12-02",
    "zones": ["entry"],
    "count": 15,
    "data": {
      "box": [0.5, 0.5, 0.2, 0.3],
      "top_score": 0.89
    }
  }
]
```

**Use case:** Для построения графиков активности по дням/камерам.

### Event Media

**Clip (video):** `GET /api/events/{event_id}/clip.mp4`
```bash
curl http://10.0.10.3:5000/api/events/1764681223.810482-moeodu/clip.mp4 -o event.mp4
```

**Snapshot:** `GET /api/events/{event_id}/snapshot.jpg`
```bash
curl http://10.0.10.3:5000/api/events/1764681223.810482-moeodu/snapshot.jpg -o event.jpg
```

**Thumbnail:** `GET /api/events/{event_id}/thumbnail.jpg`
```bash
# Оптимизирован для уведомлений (Android 2:1 aspect ratio)
curl http://10.0.10.3:5000/api/events/1764681223.810482-moeodu/thumbnail.jpg -o thumb.jpg
```

---

## Statistics & Monitoring

### System Stats

**Endpoint:** `GET /api/stats`

```bash
curl http://10.0.10.3:5000/api/stats | jq
```

**Response structure:**
```json
{
  "cameras": {
    "cam-doorbell": {
      "camera_fps": 5.1,
      "process_fps": 5.1,
      "skipped_fps": 0.0,
      "detection_fps": 0.0,
      "detection_enabled": true,
      "pid": 871,
      "capture_pid": 1145,
      "ffmpeg_pid": 1151,
      "audio_rms": 0.0,
      "audio_dBFS": 0.0
    }
  },
  "detectors": {
    "coral": {
      "inference_speed": 6.25,
      "detection_start": 1764681163.090008,
      "pid": 713
    }
  },
  "detection_fps": 12.6,
  "gpu_usages": {
    "amd-vaapi": {
      "gpu": "5.00%",
      "mem": "76.51%"
    }
  },
  "cpu_usages": {
    "frigate.full_system": {
      "cpu": "8.1",
      "mem": "34.5"
    }
  },
  "service": {
    "uptime": 91,
    "version": "0.16.2-4d58206",
    "storage": {
      "/media/frigate/recordings": {
        "total": 1841635.6,
        "used": 18481.5,
        "free": 1823154.1,
        "mount_type": "zfs"
      }
    },
    "temperatures": {
      "apex_0": 40.05
    }
  }
}
```

**Ключевые метрики:**
- `camera_fps` - FPS получаемый с камеры
- `process_fps` - FPS обрабатываемый Frigate
- `skipped_fps` - пропущенные кадры (если > 0, камера не успевает)
- `detection_fps` - FPS на которых запускается детекция
- `inference_speed` - время детекции в миллисекундах (Coral EdgeTPU: ~6ms)

**Monitoring use case:**
```python
import requests
import time

def check_camera_health():
    stats = requests.get('http://10.0.10.3:5000/api/stats').json()

    for camera, data in stats['cameras'].items():
        if data['skipped_fps'] > 1.0:
            print(f"⚠️ {camera}: dropping frames ({data['skipped_fps']} FPS)")

        if data['camera_fps'] < 3.0:
            print(f"❌ {camera}: low FPS ({data['camera_fps']})")

    detector = stats['detectors']['coral']
    if detector['inference_speed'] > 50:
        print(f"⚠️ Detector slow: {detector['inference_speed']}ms")
```

### Configuration

**Endpoint:** `GET /api/config`

Возвращает полную конфигурацию Frigate (камеры, зоны, детекторы, MQTT и т.д.)

```bash
curl http://10.0.10.3:5000/api/config | jq
```

**Полезные запросы:**
```bash
# Список всех камер
curl -s http://10.0.10.3:5000/api/config | jq '.cameras | keys'

# Зоны для конкретной камеры
curl -s http://10.0.10.3:5000/api/config | jq '.cameras["cam-parking-secondary"].zones'

# Объекты отслеживания
curl -s http://10.0.10.3:5000/api/config | jq '.cameras["cam-parking-secondary"].objects.track'

# MQTT настройки
curl -s http://10.0.10.3:5000/api/config | jq '.mqtt'
```

### Version

**Endpoint:** `GET /api/version`

```bash
curl http://10.0.10.3:5000/api/version
# Output: 0.16.2-4d58206
```

---

## Advanced Features

### Video on Demand (HLS)

Frigate поддерживает HLS стриминг записей.

**Hourly recording:**
```
GET /vod/{year}-{month}/{day}/{hour}/{camera}/master.m3u8
```

```bash
# Запись с cam-doorbell за 13:00 2 декабря 2025
curl http://10.0.10.3:5000/vod/2025-12/02/13/cam-doorbell/master.m3u8
```

**Event recording:**
```
GET /vod/event/{event-id}/index.m3u8
```

```bash
curl http://10.0.10.3:5000/vod/event/1764681223.810482-moeodu/index.m3u8
```

**Time range recording:**
```
GET /vod/{camera}/start/{start-timestamp}/end/{end-timestamp}/index.m3u8
```

```bash
# Запись за период
START=$(date -d '2 hours ago' +%s)
END=$(date +%s)
curl "http://10.0.10.3:5000/vod/cam-doorbell/start/${START}/end/${END}/index.m3u8"
```

**Использование с video.js:**
```html
<video id="video" controls></video>
<script src="https://cdn.jsdelivr.net/npm/video.js@7/dist/video.min.js"></script>
<script>
  var player = videojs('video');
  player.src({
    src: 'http://10.0.10.3:5000/vod/event/1764681223.810482-moeodu/index.m3u8',
    type: 'application/x-mpegURL'
  });
</script>
```

### Go2RTC Integration

Frigate использует go2rtc для стриминга. Напрямую можно обращаться к go2rtc на порту 1984:

**WebRTC stream:**
```
ws://10.0.10.3:1984/api/ws?src={stream_name}
```

**Доступные стримы из конфига:**
- `zosi_nvr_0..7` - основные камеры через Bubble протокол
- `10_0_20_111_main`, `10_0_20_111_sub` - RTSP камеры
- и другие из конфига go2rtc

**Для низкой задержки используйте WebRTC вместо MJPEG.**

### MQTT Topics

Frigate публикует события в MQTT (если настроен):

**Topics:**
- `frigate/available` - статус Frigate (online/offline)
- `frigate/{camera}/motion` - детекция движения
- `frigate/{camera}/{label}` - детекция объекта
- `frigate/events` - новые события
- `frigate/stats` - статистика

**Example (Python + paho-mqtt):**
```python
import paho.mqtt.client as mqtt
import json

def on_message(client, userdata, message):
    if message.topic.startswith('frigate/') and '/person' in message.topic:
        data = json.loads(message.payload)
        camera = message.topic.split('/')[1]
        print(f"Person detected on {camera}: score={data['score']}")

client = mqtt.Client()
client.on_message = on_message
client.connect("10.0.20.100", 1883)
client.subscribe("frigate/+/person")
client.loop_forever()
```

### Creating Manual Events

**Endpoint:** `POST /api/events/{camera_name}/{label}/create`

Создает событие вручную (полезно для интеграций).

```bash
curl -X POST http://10.0.10.3:5000/api/events/cam-doorbell/person/create \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "api",
    "sub_label": "delivery",
    "duration": 30
  }'
```

---

## Performance Optimization

### Bandwidth Optimization

**Проблема:** 15 камер × 5 FPS × 50KB = ~3.75 MB/s

**Решения:**

1. **Используйте параметр `h=` для уменьшения разрешения:**
```bash
# Thumbnail: h=180 (~20KB per frame)
# Grid view: h=360 (~50KB per frame)
# Single view: h=720 (~150KB per frame)
```

2. **Static snapshots вместо MJPEG для неактивных камер:**
```javascript
// Обновление каждые 2 секунды вместо 5 FPS
setInterval(() => {
  img.src = `http://10.0.10.3:5000/api/cam-doorbell/latest.jpg?h=360&t=${Date.now()}`;
}, 2000);
```

3. **Используйте `include_thumbnails=0` для events API:**
```bash
curl "http://10.0.10.3:5000/api/events?limit=100&include_thumbnails=0"
```

### Caching Strategy

**Backend proxy pattern:**
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import requests
import time

app = FastAPI()
camera_cache = {}

@app.get("/camera/{camera_name}/latest")
async def get_latest(camera_name: str):
    # Cache для 1 секунды
    cache_key = camera_name
    now = time.time()

    if cache_key in camera_cache:
        cached_img, cached_time = camera_cache[cache_key]
        if now - cached_time < 1.0:
            return StreamingResponse(io.BytesIO(cached_img), media_type="image/jpeg")

    # Fetch from Frigate
    response = requests.get(f'http://10.0.10.3:5000/api/{camera_name}/latest.jpg?h=360')
    image_data = response.content
    camera_cache[cache_key] = (image_data, now)

    return StreamingResponse(io.BytesIO(image_data), media_type="image/jpeg")
```

### Connection Pooling

**Используйте connection pooling для множественных запросов:**
```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()
retry = Retry(total=3, backoff_factor=0.1)
adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
session.mount('http://', adapter)

# Теперь используйте session вместо requests
response = session.get('http://10.0.10.3:5000/api/events')
```

---

## Common Patterns

### Real-time Event Monitoring

**Polling pattern (простой):**
```python
import requests
import time

last_event_id = None

while True:
    events = requests.get('http://10.0.10.3:5000/api/events?limit=1').json()

    if events and events[0]['id'] != last_event_id:
        event = events[0]
        last_event_id = event['id']

        print(f"🔔 New event: {event['label']} on {event['camera']}")

        if event['has_clip']:
            # Download clip
            clip = requests.get(f"http://10.0.10.3:5000/api/events/{event['id']}/clip.mp4")
            with open(f"clips/{event['id']}.mp4", 'wb') as f:
                f.write(clip.content)

    time.sleep(2)  # Poll every 2 seconds
```

**MQTT pattern (эффективнее):**
```python
import paho.mqtt.client as mqtt
import requests
import json

def on_message(client, userdata, message):
    if 'frigate/events' in message.topic:
        event_data = json.loads(message.payload)

        if event_data['type'] == 'new':
            event_id = event_data['after']['id']
            print(f"🔔 New event: {event_id}")

            # Fetch full event details
            event = requests.get(f'http://10.0.10.3:5000/api/events/{event_id}').json()
            process_event(event)

client = mqtt.Client()
client.on_message = on_message
client.connect("10.0.20.100", 1883)
client.subscribe("frigate/events")
client.loop_forever()
```

### Multi-Camera Dashboard

**FastAPI Backend:**
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import requests

app = FastAPI()

CAMERAS = [
    "cam-doorbell", "cam-main-gate", "cam-parking-secondary",
    "cam-yard-entrance", "cam-house-entrance"
]

@app.get("/cameras")
async def list_cameras():
    stats = requests.get('http://10.0.10.3:5000/api/stats').json()
    return [
        {
            "name": cam,
            "fps": stats['cameras'][cam]['camera_fps'],
            "detection_enabled": stats['cameras'][cam]['detection_enabled'],
            "stream_url": f"/camera/{cam}/stream",
            "snapshot_url": f"/camera/{cam}/snapshot"
        }
        for cam in CAMERAS
    ]

@app.get("/camera/{camera_name}/stream")
async def stream_camera(camera_name: str):
    req = requests.get(f'http://10.0.10.3:5000/api/{camera_name}?h=480', stream=True)
    return StreamingResponse(
        req.iter_content(chunk_size=1024),
        media_type="multipart/x-mixed-replace;boundary=frame"
    )

@app.get("/camera/{camera_name}/snapshot")
async def snapshot_camera(camera_name: str):
    req = requests.get(f'http://10.0.10.3:5000/api/{camera_name}/latest.jpg?h=360')
    return StreamingResponse(
        io.BytesIO(req.content),
        media_type="image/jpeg"
    )
```

**React Frontend:**
```tsx
import React, { useEffect, useState } from 'react';

interface Camera {
  name: string;
  fps: number;
  stream_url: string;
  snapshot_url: string;
}

const CameraGrid: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  useEffect(() => {
    fetch('/cameras')
      .then(res => res.json())
      .then(setCameras);
  }, []);

  return (
    <div className="camera-grid">
      {cameras.map(camera => (
        <div key={camera.name} className="camera-card">
          <h3>{camera.name}</h3>

          {selectedCamera === camera.name ? (
            // Live MJPEG stream for selected camera
            <img
              src={`http://localhost:8000${camera.stream_url}`}
              alt={camera.name}
              className="camera-stream"
            />
          ) : (
            // Static snapshot for others (updated every 2s)
            <img
              src={`http://localhost:8000${camera.snapshot_url}?t=${Date.now()}`}
              alt={camera.name}
              className="camera-snapshot"
              onClick={() => setSelectedCamera(camera.name)}
            />
          )}

          <div className="camera-info">
            FPS: {camera.fps.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Zone-based Alerts

```python
import requests

def check_zone_intrusion():
    # Get events in specific zone from last 5 minutes
    five_min_ago = int(time.time()) - 300

    events = requests.get(
        'http://10.0.10.3:5000/api/events',
        params={
            'zones': 'parking',
            'labels': 'person',
            'after': five_min_ago,
            'cameras': 'cam-parking-secondary'
        }
    ).json()

    for event in events:
        if event['zones'] and 'parking' in event['zones']:
            # Person detected in parking zone
            send_alert(
                title=f"Person in parking",
                message=f"Detected at {event['start_time']}",
                thumbnail_url=f"http://10.0.10.3:5000/api/events/{event['id']}/thumbnail.jpg"
            )
```

### Drawing Bounding Boxes

```python
import requests
import cv2
import numpy as np
from PIL import Image
from io import BytesIO

def draw_detections(camera_name: str):
    # Get latest frame
    img_response = requests.get(f'http://10.0.10.3:5000/api/{camera_name}/latest.jpg')
    img = Image.open(BytesIO(img_response.content))
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    height, width = img_cv.shape[:2]

    # Get recent events
    events = requests.get(
        f'http://10.0.10.3:5000/api/events',
        params={'cameras': camera_name, 'limit': 5}
    ).json()

    for event in events:
        if event['end_time'] is None:  # Still active
            box = event['data']['box']  # [x_center, y_center, width, height]

            # Convert relative to absolute coordinates
            x_center = int(box[0] * width)
            y_center = int(box[1] * height)
            w = int(box[2] * width)
            h = int(box[3] * height)

            x1 = x_center - w // 2
            y1 = y_center - h // 2
            x2 = x_center + w // 2
            y2 = y_center + h // 2

            # Draw rectangle
            cv2.rectangle(img_cv, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Draw label
            label = f"{event['label']} {event['data']['score']:.2f}"
            cv2.putText(img_cv, label, (x1, y1-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return img_cv
```

---

## Error Handling

### Common Issues

**1. Empty MJPEG stream:**
```python
# Проблема: камера не отдает кадры
# Решение: проверить stats API
stats = requests.get('http://10.0.10.3:5000/api/stats').json()
camera_fps = stats['cameras']['cam-doorbell']['camera_fps']
if camera_fps < 1.0:
    print("Camera not producing frames")
```

**2. Event has_clip=true но клип недоступен:**
```python
# Событие может еще записываться
# Проверить end_time
event = requests.get(f'http://10.0.10.3:5000/api/events/{event_id}').json()
if event['end_time'] is None:
    print("Event still recording, wait...")
    time.sleep(5)
```

**3. CORS issues:**
```python
# Если Frigate и frontend на разных доменах
# Добавить в FastAPI backend:
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## API Limits & Best Practices

1. **MJPEG streams:** Один клиент = один запрос к Frigate. При 15+ клиентах используйте backend proxy.

2. **Events API:** Используйте `limit=` и `after=` для пагинации, не запрашивайте все события.

3. **Polling interval:** Не опрашивайте API чаще чем раз в секунду для snapshots.

4. **MQTT vs Polling:** Для real-time используйте MQTT вместо polling events API.

5. **Storage:** События с клипами занимают место. Настройте retention policy в конфиге Frigate.

6. **Detection FPS:** Чем выше detection_fps, тем больше нагрузка. 5 FPS достаточно для большинства случаев.

---

## Useful Scripts

### Health Check Script
```bash
#!/bin/bash
# check_frigate_health.sh

FRIGATE_URL="http://10.0.10.3:5000"

# Check if Frigate is responding
if ! curl -s "$FRIGATE_URL/api/version" > /dev/null; then
    echo "❌ Frigate is down!"
    exit 1
fi

# Check camera FPS
STATS=$(curl -s "$FRIGATE_URL/api/stats")
echo "$STATS" | jq -r '.cameras | to_entries[] |
    select(.value.camera_fps < 3.0) |
    "⚠️ \(.key): Low FPS (\(.value.camera_fps))"'

# Check detector speed
DETECTOR_SPEED=$(echo "$STATS" | jq -r '.detectors.coral.inference_speed')
if (( $(echo "$DETECTOR_SPEED > 50" | bc -l) )); then
    echo "⚠️ Detector slow: ${DETECTOR_SPEED}ms"
fi

echo "✅ All checks passed"
```

### Backup Events
```python
# backup_events.py
import requests
import os
from datetime import datetime, timedelta

FRIGATE_URL = "http://10.0.10.3:5000"
BACKUP_DIR = "./frigate_backup"

# Get events from last 24 hours
yesterday = int((datetime.now() - timedelta(days=1)).timestamp())
events = requests.get(f"{FRIGATE_URL}/api/events", params={
    'after': yesterday,
    'has_clip': 1
}).json()

os.makedirs(BACKUP_DIR, exist_ok=True)

for event in events:
    event_id = event['id']
    camera = event['camera']
    label = event['label']

    # Download clip
    clip = requests.get(f"{FRIGATE_URL}/api/events/{event_id}/clip.mp4")
    filename = f"{BACKUP_DIR}/{camera}_{label}_{event_id}.mp4"

    with open(filename, 'wb') as f:
        f.write(clip.content)

    print(f"✓ Backed up: {filename}")
```

---

## Conclusion

Frigate API предоставляет всё необходимое для построения полноценной системы видеонаблюдения:
- Real-time стримы (MJPEG, HLS, WebRTC через go2rtc)
- События с детекциями и треками объектов
- Статистика и мониторинг
- Гибкая фильтрация и поиск
- MQTT для интеграций

Для production системы рекомендую:
1. Backend proxy (FastAPI/Node.js) между Frigate и фронтендом
2. MQTT для real-time событий вместо polling
3. WebSocket/SignalR для push уведомлений на frontend
4. Caching стратегию для снижения нагрузки
5. WebRTC (go2rtc) для минимальной задержки

**Base URL вашего инстанса:** `http://10.0.10.3:5000`
