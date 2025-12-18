# WebRTC Proxy через Backend с Авторизацией

## Что сделано

### 1. Исправлены SSE эндпоинты
- ✅ `/api/mqtt/stream` - теперь поддерживает `?token=JWT`
- ✅ `/api/automations/{name}/logs` - теперь поддерживает `?token=JWT`

**Изменено:** `CurrentUser` → `CurrentUserOrToken`

### 2. Добавлено проксирование go2rtc

#### HTTP Proxy
**Endpoint:** `/api/frigate/go2rtc/{path:path}`

**Примеры:**
```
GET /api/frigate/go2rtc/stream.html?src=10_0_20_111_main&token=JWT
GET /api/frigate/go2rtc/api/streams?token=JWT
POST /api/frigate/go2rtc/api/webrtc?src=camera_name&token=JWT
```

**Поддерживает:**
- ✅ Bearer header авторизация
- ✅ Query параметр `?token=JWT`
- ✅ Все HTTP методы (GET, POST, PUT, DELETE, PATCH)

#### WebSocket Proxy
**Endpoint:** `ws://backend/api/frigate/go2rtc/api/ws`

**Использование:**
```javascript
const token = 'your_jwt_token';
const camera = '10_0_20_111_main';
const ws = new WebSocket(`ws://localhost:8000/api/frigate/go2rtc/api/ws?src=${camera}&token=${token}`);
```

**Авторизация:**
- ✅ Query параметр `?token=JWT` (обязательный)
- ✅ Bidirectional proxying (клиент ↔ go2rtc)

## Конфигурация

### Backend (.env)
```bash
GO2RTC_URL=http://10.0.10.3:1984
```

### Docker
Нужно пересобрать backend для установки `websockets`:

```bash
cd /home/user/my-home-panel
docker-compose build backend
docker-compose up -d backend
```

## Использование на Frontend

### Вариант 1: Прямое использование stream.html
```typescript
const token = useAuthStore.getState().token;
const camera = '10_0_20_111_main';
const url = `${API_URL}/api/frigate/go2rtc/stream.html?src=${camera}&token=${token}`;

// Открыть в iframe
<iframe src={url} />
```

### Вариант 2: Кастомный WebRTC компонент
```typescript
import { useAuthStore } from '@/stores/authStore';

function WebRTCPlayer({ camera }: { camera: string }) {
  const token = useAuthStore((state) => state.token);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const wsUrl = `ws://localhost:8000/api/frigate/go2rtc/api/ws?src=${camera}&token=${token}`;

    // Используйте go2rtc video-stream.js или свою реализацию
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebRTC connected');
    };

    ws.onmessage = (event) => {
      // Обработка WebRTC сигнализации
    };

    return () => ws.close();
  }, [camera, token]);

  return <video ref={videoRef} autoPlay />;
}
```

### Вариант 3: Использовать go2rtc клиент библиотеки
Можно скопировать `video-stream.js` из go2rtc и модифицировать URL:

```javascript
// Изменить в video-stream.js:
const wsUrl = new URL('api/ws?src=' + stream, location.href);
// На:
const token = getJWT();
const wsUrl = `ws://backend/api/frigate/go2rtc/api/ws?src=${stream}&token=${token}`;
```

## Безопасность

✅ **Реализовано:**
- JWT авторизация для всех запросов
- Query параметр `?token=` для WebSocket (нет другого способа)
- Проверка токена перед установкой WebSocket соединения
- Токен удаляется из query перед проксированием к go2rtc

⚠️ **Риски:**
- JWT в URL query (логируется в access logs)
- Рекомендация: использовать HTTPS + короткий TTL токенов

## Список камер

Из вашего go2rtc:
```
10_0_20_111_main
10_0_20_111_sub
10_0_20_116_main
10_0_20_118_main
10_0_20_118_sub
10_0_20_119_main
10_0_20_119_sub
10_0_20_120_main
10_0_20_120_sub
10_0_20_122_main
10_0_20_122_sub
10_0_20_123_main
10_0_20_123_sub
birdseye
zosi_nvr_0
zosi_nvr_1
zosi_nvr_2
zosi_nvr_3
zosi_nvr_4
zosi_nvr_5
zosi_nvr_6
```

## Тестирование

### 1. Проверка HTTP proxy
```bash
# Получить JWT токен
TOKEN="your_jwt_token"

# Проверить доступ к stream.html
curl "http://localhost:8000/api/frigate/go2rtc/stream.html?token=$TOKEN"

# Проверить список стримов
curl "http://localhost:8000/api/frigate/go2rtc/api/streams?token=$TOKEN"
```

### 2. Проверка WebSocket
```javascript
// В браузере console
const token = localStorage.getItem('auth_token');
const parsed = JSON.parse(token);
const ws = new WebSocket(`ws://localhost:8000/api/frigate/go2rtc/api/ws?src=10_0_20_111_main&token=${parsed.state.token}`);
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

## Troubleshooting

### Backend не запускается
```bash
# Проверить логи
docker-compose logs backend

# Проверить что websockets установлен
docker-compose exec backend pip list | grep websockets
```

### WebSocket не подключается
- Проверить что токен валидный: `verify_jwt(token)` возвращает payload
- Проверить логи backend: `docker-compose logs -f backend`
- Проверить что go2rtc доступен: `curl http://10.0.10.3:1984/api/streams`

### SSE не работает
- Убедиться что используете `?token=` параметр
- Проверить что `CurrentUserOrToken` импортирован в роутерах
- Проверить network в DevTools → видно ли query параметр `?token=`

## Следующие шаги

1. Пересобрать и перезапустить backend
2. Протестировать HTTP proxy через браузер
3. Протестировать WebSocket подключение
4. Создать React компонент для WebRTC плеера
5. Интегрировать в существующий UI
