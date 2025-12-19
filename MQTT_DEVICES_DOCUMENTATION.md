# 📡 Полная документация по MQTT устройствам

## 📋 Оглавление
1. [Общая информация](#общая-информация)
2. [API endpoints](#api-endpoints)
3. [SSE стрим](#sse-стрим)
4. [Устройства по комнатам](#устройства-по-комнатам)
5. [Типы устройств](#типы-устройств)

---

## Общая информация

**MQTT API URL:** `http://10.0.20.102:8081`
**Backend proxy:** `http://localhost:8000/api/mqtt`
**Формат топиков Zigbee2mqtt:** `zigbee2mqtt/{дом}-{комната}-{объект}-{тип}`

### Нейминг устройств

Все устройства следуют единому стандарту:
```
{дом}-{комната}-{объект}-{тип}
```

- **дом:** `main`, `sporthouse`, `staff`, `security`, `alla`, `dog`, `parking`
- **комната:** `livingroom`, `kitchen`, `vadim`, `eduard`, `wc1`, `hallway`, `dressingroom`, `conservatory`, `street`
- **объект:** `bed`, `window`, `door`, `table`, `wardrobe`, `bigwardrobe`, `smallwardrobe`, `storage`, `room`, `map_wall`
- **тип:** `switch`, `light`, `dimmer`, `relay`, `curtain`, `button_light`, `button_curtain`, `motion_sensor`, `contact_sensor`, `strip`

---

## API endpoints

### Получение всех топиков
```bash
GET /api/mqtt/topics
Authorization: Bearer {JWT_TOKEN}
```

**Ответ:**
```json
{
  "topics": {
    "zigbee2mqtt/device-name": {
      "topic": "zigbee2mqtt/device-name",
      "payload": {...},
      "timestamp": "2025-12-19T11:00:00Z"
    }
  },
  "total": 150
}
```

### Получение одного топика
```bash
GET /api/mqtt/topic?path=zigbee2mqtt/device-name
Authorization: Bearer {JWT_TOKEN}
```

### Публикация команды
```bash
POST /api/mqtt/publish
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "topic": "zigbee2mqtt/device-name/set",
  "payload": {"state": "ON"}
}
```

**Ответ:**
```json
{
  "success": true,
  "topic": "zigbee2mqtt/device-name/set",
  "error": null
}
```

### Health check
```bash
GET /api/mqtt/health
Authorization: Bearer {JWT_TOKEN}
```

---

## SSE стрим

### Подключение к стриму
```bash
GET /api/mqtt/stream?topics=*
Authorization: Bearer {JWT_TOKEN}
```

**Параметры:**
- `topics` - фильтр топиков (опционально)
  - `*` - все топики
  - `zigbee2mqtt/*` - только Zigbee устройства
  - `automation/*` - только автоматизации
  - `zigbee2mqtt/main-vadim-*` - устройства комнаты Вадима
  - `zigbee2mqtt/*,automation/*` - комбинированный фильтр

**Формат событий:**
```
event: message
data: {"topic": "zigbee2mqtt/...", "payload": {...}, "timestamp": "..."}

event: ping
data:
```

**Примеры использования:**

JavaScript (EventSource):
```javascript
const token = "your-jwt-token";
const eventSource = new EventSource(
  `/api/mqtt/stream?topics=zigbee2mqtt/*&token=${token}`
);

eventSource.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  console.log('Update:', data.topic, data.payload);
});
```

cURL:
```bash
curl -N -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:8000/api/mqtt/stream?topics=*"
```

---

## Устройства по комнатам


### 🏠 Гостиная (Livingroom)

#### main-livingroom-map_wall-relay
**Тип:** Двухлинейное реле (2-channel relay)
**Топик:** `zigbee2mqtt/main-livingroom-map_wall-relay`
**Управление:** `zigbee2mqtt/main-livingroom-map_wall-relay/set`

**Поля состояния:**
- `state_l1` - линия 1 (ON/OFF)
- `state_l2` - линия 2 (ON/OFF)
- `power` - мощность (W)
- `consumption` - потребление (kWh)
- `voltage` - напряжение (V)
- `device_temperature` - температура устройства (°C)

**Примеры команд:**
```bash
# Включить линию 1
curl -X POST 'http://localhost:8000/api/mqtt/publish' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{"topic": "zigbee2mqtt/main-livingroom-map_wall-relay/set", "payload": {"state_l1": "ON"}}'

# Включить линию 2
curl -X POST 'http://localhost:8000/api/mqtt/publish' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{"topic": "zigbee2mqtt/main-livingroom-map_wall-relay/set", "payload": {"state_l2": "ON"}}'

# Включить обе линии
curl -X POST 'http://localhost:8000/api/mqtt/publish' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{"topic": "zigbee2mqtt/main-livingroom-map_wall-relay/set", "payload": {"state_l1": "ON", "state_l2": "ON"}}'
```

---

#### main-livingroom-room-switch
**Тип:** Двухклавишный выключатель (2-gang switch)
**Топик:** `zigbee2mqtt/main-livingroom-room-switch`
**Управление:** `zigbee2mqtt/main-livingroom-room-switch/set`

**Поля состояния:**
- `state` - общее состояние (ON/OFF)
- `state_left` - левая клавиша (ON/OFF)
- `state_right` - правая клавиша (ON/OFF)
- `power` - мощность (W)
- `consumption` - потребление (kWh)
- `voltage` - напряжение (V)

**Примеры команд:**
```bash
# Включить левую клавишу
{"topic": "zigbee2mqtt/main-livingroom-room-switch/set", "payload": {"state_left": "ON"}}

# Включить правую клавишу
{"topic": "zigbee2mqtt/main-livingroom-room-switch/set", "payload": {"state_right": "ON"}}

# Включить обе клавиши
{"topic": "zigbee2mqtt/main-livingroom-room-switch/set", "payload": {"state": "ON"}}

# Выключить все
{"topic": "zigbee2mqtt/main-livingroom-room-switch/set", "payload": {"state": "OFF"}}
```

---

### 🛏️ Комната Эдуарда (Eduard)

#### main-eduard-bigwardrobe-switch
**Тип:** Двухклавишный выключатель (2-gang switch)
**Назначение:** Освещение большого шкафа
**Топик:** `zigbee2mqtt/main-eduard-bigwardrobe-switch`
**Управление:** `zigbee2mqtt/main-eduard-bigwardrobe-switch/set`

**Поля состояния:**
- `state` - общее состояние
- `state_left` - левая клавиша
- `state_right` - правая клавиша
- `power`, `consumption`, `voltage`

**Связанные датчики:**
- `main-eduard-bigwardrobe_left-contact_sensor` - датчик левой двери
- `main-eduard-bigwardrobe_right-contact_sensor` - датчик правой двери

---

#### main-eduard-smallwardrobe-dimmer
**Тип:** Диммер (dimmable light)
**Назначение:** Освещение малого шкафа
**Топик:** `zigbee2mqtt/main-eduard-smallwardrobe-dimmer`
**Управление:** `zigbee2mqtt/main-eduard-smallwardrobe-dimmer/set`

**Поля состояния:**
- `state` - состояние (ON/OFF)
- `brightness` - яркость (0-254)

**Связанные датчики:**
- `main-eduard-smallwardrobe-contact_sensor` - датчик двери

**Примеры команд:**
```bash
# Включить на 50% яркости
{"topic": "zigbee2mqtt/main-eduard-smallwardrobe-dimmer/set", "payload": {"state": "ON", "brightness": 127}}

# Включить на максимум
{"topic": "zigbee2mqtt/main-eduard-smallwardrobe-dimmer/set", "payload": {"state": "ON", "brightness": 254}}

# Плавное изменение яркости за 5 секунд
{"topic": "zigbee2mqtt/main-eduard-smallwardrobe-dimmer/set", "payload": {"brightness": 200, "transition": 5}}
```

---

#### main-eduard-storage-switch
**Тип:** Двухклавишный выключатель
**Назначение:** Освещение подсобки
**Топик:** `zigbee2mqtt/main-eduard-storage-switch`

**Связанные датчики:**
- `main-eduard-storage-contact_sensor` - датчик двери подсобки

---

#### main-eduard-brightlight-switch
**Тип:** Двухклавишный выключатель
**Назначение:** Яркое освещение комнаты
**Топик:** `zigbee2mqtt/main-eduard-brightlight-switch`

---

#### main-eduard-virtual-switch
**Тип:** Виртуальный двухклавишный выключатель (decoupled mode)
**Топик:** `zigbee2mqtt/main-eduard-virtual-switch`

**Особенности:**
- `operation_mode_left: "decoupled"` - левая клавиша в виртуальном режиме
- `operation_mode_right: "decoupled"` - правая клавиша в виртуальном режиме
- Не управляет нагрузкой напрямую, только генерирует события для автоматизации

---

### 🍳 Кухня (Kitchen)

#### main-kitchen-bright-switch
**Тип:** Двухклавишный выключатель
**Назначение:** Яркое освещение кухни
**Топик:** `zigbee2mqtt/main-kitchen-bright-switch`
**События:** `zigbee2mqtt/main-kitchen-bright-switch/action`

**Возможные действия:**
- `single_left` - одиночное нажатие левой
- `single_right` - одиночное нажатие правой
- `single_both` - одиночное нажатие обеих
- `double_left`, `double_right`, `double_both` - двойное нажатие
- `hold_left`, `hold_right`, `hold_both` - удержание

---

#### main-kitchen-table-switch
**Тип:** Двухклавишный выключатель
**Назначение:** Освещение над столом
**Топик:** `zigbee2mqtt/main-kitchen-table-switch`
**События:** `zigbee2mqtt/main-kitchen-table-switch/action`

---

### 🛏️ Комната Вадима (Vadim)

#### main-vadim-room-light
**Тип:** Двухклавишный выключатель
**Топик:** `zigbee2mqtt/main-vadim-room-light`
**Управление:** `zigbee2mqtt/main-vadim-room-light/set`

**Назначение клавиш:**
- `state_left` - боковой свет
- `state_right` - люстра

**Примеры команд:**
```bash
# Включить боковой свет
{"topic": "zigbee2mqtt/main-vadim-room-light/set", "payload": {"state_left": "ON"}}

# Включить люстру
{"topic": "zigbee2mqtt/main-vadim-room-light/set", "payload": {"state_right": "ON"}}

# Включить все
{"topic": "zigbee2mqtt/main-vadim-room-light/set", "payload": {"state": "ON"}}
```

---

#### main-vadim-bed-yeelight
**Тип:** RGB LED подсветка под кроватью (automation device)
**Топик:** `automation_devices/main-vadim-bed-yeelight`
**Управление:** `automation_devices/main-vadim-bed-yeelight/set`

**⚠️ ВАЖНО:** Это устройство в топике `automation_devices/`, а не `zigbee2mqtt/`

**Поля состояния:**
- `state` - состояние (ON/OFF)
- `color` - цвет RGB `{r: 0-255, g: 0-255, b: 0-255}`
- `brightness` - яркость (0-100)
- `color_temp` - цветовая температура (K)

**Примеры команд:**
```bash
# Синий свет
{"topic": "automation_devices/main-vadim-bed-yeelight/set", "payload": {"state": "ON", "color": {"r": 0, "g": 0, "b": 255}, "brightness": 100}}

# Красный свет на 50%
{"topic": "automation_devices/main-vadim-bed-yeelight/set", "payload": {"state": "ON", "color": {"r": 255, "g": 0, "b": 0}, "brightness": 50}}

# Зеленый свет
{"topic": "automation_devices/main-vadim-bed-yeelight/set", "payload": {"state": "ON", "color": {"r": 0, "g": 255, "b": 0}, "brightness": 100}}

# Теплый белый
{"topic": "automation_devices/main-vadim-bed-yeelight/set", "payload": {"state": "ON", "color": {"r": 255, "g": 200, "b": 100}, "brightness": 80}}

# Выключить
{"topic": "automation_devices/main-vadim-bed-yeelight/set", "payload": {"state": "OFF"}}
```

**⚠️ Статус:** Устройство офлайн (last_seen: 2025-11-28)

---

#### main-vadim-window-curtain
**Тип:** Моторизованная штора (motorized curtain)
**Топик:** `zigbee2mqtt/main-vadim-window-curtain`
**Управление:** `zigbee2mqtt/main-vadim-window-curtain/set`

**Поля состояния:**
- `position` - позиция (0-100, где 0=закрыто, 100=открыто)
- `state` - состояние (OPEN/CLOSE/STOP)
- `motor_state` - состояние мотора (stopped/opening/closing)
- `running` - мотор работает (true/false)

**Опции:**
- `hand_open: false` - ручное открытие отключено
- `reverse_direction: true` - направление реверсировано

**Примеры команд:**
```bash
# Открыть полностью
{"topic": "zigbee2mqtt/main-vadim-window-curtain/set", "payload": {"state": "OPEN"}}

# Закрыть полностью
{"topic": "zigbee2mqtt/main-vadim-window-curtain/set", "payload": {"state": "CLOSE"}}

# Остановить
{"topic": "zigbee2mqtt/main-vadim-window-curtain/set", "payload": {"state": "STOP"}}

# Установить позицию 50% (полуоткрыто)
{"topic": "zigbee2mqtt/main-vadim-window-curtain/set", "payload": {"position": 50}}

# Установить позицию 25%
{"topic": "zigbee2mqtt/main-vadim-window-curtain/set", "payload": {"position": 25}}
```

---

#### main-vadim-bed-button_curtain
**Тип:** Кнопка управления шторами (button, read-only)
**Топик:** `zigbee2mqtt/main-vadim-bed-button_curtain`
**События:** `zigbee2mqtt/main-vadim-bed-button_curtain/action`

**⚠️ ВАЖНО:** Это устройство только для чтения, команды отправлять нельзя

**Поля состояния:**
- `battery` - уровень заряда (%)
- `voltage` - напряжение батареи (mV)

**Возможные события action:**
- `single` - одиночное нажатие (шторы вниз)
- `double` - двойное нажатие (шторы вверх)
- `hold` - удержание (стоп)
- `release` - отпускание после удержания

**Автоматизация:** `vadim/curtain-button`

---

#### main-vadim-bed-button_light
**Тип:** Кнопка управления светом (button, read-only)
**Топик:** `zigbee2mqtt/main-vadim-bed-button_light`
**События:** `zigbee2mqtt/main-vadim-bed-button_light/action`

**Возможные события action:**
- `single` - одиночное нажатие (левый свет)
- `double` - двойное нажатие (правый свет)
- `hold` - длительное нажатие (выключить оба + Yeelight)

**Автоматизация:** `vadim/bed-button-light` (версия 1.3.0)

---

#### main-vadim-bed-motion_sensor
**Тип:** Датчик движения (motion sensor, read-only)
**Топик:** `zigbee2mqtt/main-vadim-bed-motion_sensor`

**Поля состояния:**
- `occupancy` - присутствие обнаружено (true/false)
- `illuminance` - освещенность (lux)
- `battery` - уровень заряда (%)
- `voltage` - напряжение батареи (mV)
- `device_temperature` - температура датчика (°C)

---

### 🚪 Гардеробная (Dressingroom)

#### main-dressingroom-room-switch
**Тип:** Двухклавишный выключатель
**Топик:** `zigbee2mqtt/main-dressingroom-room-switch`

---

#### main-dressingroom-room-motion_sensor
**Тип:** Датчик движения
**Топик:** `zigbee2mqtt/main-dressingroom-room-motion_sensor`

**Автоматизация:** `bedroom/wardrobe-motion` - автоматическое включение света при движении

---

### 🚽 Туалет 1 (WC1)

#### main-wc1-room-switch
**Тип:** Двухклавишный выключатель
**Топик:** `zigbee2mqtt/main-wc1-room-switch`

**Особенности:**
- `operation_mode_right: "decoupled"` - правая клавиша в виртуальном режиме

---

#### main-wc1-room-strip
**Тип:** Двухлинейная RGB LED лента (2-channel LED strip)
**Топик:** `zigbee2mqtt/main-wc1-room-strip`
**Управление:** `zigbee2mqtt/main-wc1-room-strip/set`

**Поля состояния:**
- `state` - общее состояние
- `state_l1` - линия 1 (ON/OFF)
- `state_l2` - линия 2 (ON/OFF)
- `brightness_l1` - яркость линии 1 (1-254)
- `brightness_l2` - яркость линии 2 (1-254)
- `color_l1` - цвет линии 1 (xy или color_temp)
- `color_temp_l1` - цветовая температура линии 1 (Mireds)

**Примеры команд:**
```bash
# Включить линию 1 на 100% яркости
{"topic": "zigbee2mqtt/main-wc1-room-strip/set", "payload": {"state_l1": "ON", "brightness_l1": 254}}

# Включить линию 2 на 50% яркости
{"topic": "zigbee2mqtt/main-wc1-room-strip/set", "payload": {"state_l2": "ON", "brightness_l2": 127}}

# Установить цвет линии 1 (теплый белый)
{"topic": "zigbee2mqtt/main-wc1-room-strip/set", "payload": {"state_l1": "ON", "color_temp_l1": 370}}

# Включить обе линии
{"topic": "zigbee2mqtt/main-wc1-room-strip/set", "payload": {"state": "ON"}}

# Выключить все
{"topic": "zigbee2mqtt/main-wc1-room-strip/set", "payload": {"state": "OFF"}}
```

**Управление отдельными линиями через подтопики:**
- `zigbee2mqtt/main-wc1-room-strip/l1` - состояние линии 1
- `zigbee2mqtt/main-wc1-room-strip/l2` - состояние линии 2

---

#### main-wc1-room-motion_sensor
**Тип:** Датчик движения
**Топик:** `zigbee2mqtt/main-wc1-room-motion_sensor`

**Автоматизация:** `main/wc1/light_auto`

---

#### main-wc1-door-contact_sensor
**Тип:** Датчик контакта двери (door sensor)
**Топик:** `zigbee2mqtt/main-wc1-door-contact_sensor`

**Поля состояния:**
- `contact` - контакт (true=закрыто, false=открыто)
- `battery` - уровень заряда (%)
- `voltage` - напряжение батареи (mV)
- `trigger_count` - счетчик срабатываний

---

### 🏛️ Коридор (Hallway)

#### main-hallway-room-switch
**Тип:** Двухклавишный выключатель
**Топик:** `zigbee2mqtt/main-hallway-room-switch`
**События:** `zigbee2mqtt/main-hallway-room-switch/action`

**Особенности:**
- `flip_indicator_light: "OFF"` - индикатор выключен
- `led_disabled_night: false` - LED не отключается ночью

---

### 🌿 Зимний сад (Conservatory)

#### main-conservatory-balls-switch
**Тип:** Двухклавишный выключатель
**Назначение:** Декоративные шары
**Топик:** `zigbee2mqtt/main-conservatory-balls-switch`

**Автоматизация:** `main/conservatory/sunset_light_auto` - автоматическое включение на закате

---

### 🏠 Улица (Street)

#### main-street-windows-newyear_light
**Тип:** Умная розетка с таймером (smart plug with countdown)
**Назначение:** Новогодняя подсветка окон
**Топик:** `zigbee2mqtt/main-street-windows-newyear_light`
**Управление:** `zigbee2mqtt/main-street-windows-newyear_light/set`

**Поля состояния:**
- `state` - состояние (ON/OFF)
- `countdown` - таймер обратного отсчета (секунды)
- `power_on_behavior` - поведение при включении ("previous")
- `switch_type` - тип переключателя ("toggle")

**Примеры команд:**
```bash
# Включить
{"topic": "zigbee2mqtt/main-street-windows-newyear_light/set", "payload": {"state": "ON"}}

# Выключить через 3600 секунд (1 час)
{"topic": "zigbee2mqtt/main-street-windows-newyear_light/set", "payload": {"state": "ON", "countdown": 3600}}
```

**Автоматизация:** `main-street/windows-newyear-light`

---

## Типы устройств

### 🔌 Выключатели (Switches)

#### Двухклавишные выключатели (2-gang switches)
**Устройства:**
- main-livingroom-room-switch
- main-eduard-bigwardrobe-switch
- main-eduard-storage-switch
- main-eduard-brightlight-switch
- main-kitchen-bright-switch
- main-kitchen-table-switch
- main-vadim-room-light
- main-dressingroom-room-switch
- main-wc1-room-switch
- main-hallway-room-switch

**Общие поля:**
- `state` - общее состояние (ON/OFF)
- `state_left` - левая клавиша (ON/OFF)
- `state_right` - правая клавиша (ON/OFF)
- `power` - мощность (W)
- `consumption` - потребление (kWh)
- `voltage` - напряжение (V)
- `current` - ток (A)
- `device_temperature` - температура (°C)
- `operation_mode_left` - режим левой клавиши (null или "decoupled")
- `operation_mode_right` - режим правой клавиши (null или "decoupled")

**Команды:**
```bash
# Включить левую клавишу
{"state_left": "ON"}

# Включить правую клавишу
{"state_right": "ON"}

# Включить обе (через общий state)
{"state": "ON"}

# Выключить все
{"state": "OFF"}

# Включить обе клавиши раздельно
{"state_left": "ON", "state_right": "ON"}
```

---

### 💡 Диммеры (Dimmers)

**Устройства:**
- main-eduard-smallwardrobe-dimmer

**Поля:**
- `state` - состояние (ON/OFF)
- `brightness` - яркость (0-254)

**Команды:**
```bash
# Включить с яркостью
{"state": "ON", "brightness": 200}

# Плавное изменение за N секунд
{"brightness": 150, "transition": 3}
```

---

### 🔌 Реле (Relays)

**Устройства:**
- main-livingroom-map_wall-relay

**Поля:**
- `state_l1` - линия 1
- `state_l2` - линия 2

**Команды:**
```bash
{"state_l1": "ON"}
{"state_l2": "OFF"}
```

---

### 💡 LED ленты (LED Strips)

**Устройства:**
- main-wc1-room-strip

**Поля:**
- `state` - общее состояние
- `state_l1`, `state_l2` - линии
- `brightness_l1`, `brightness_l2` - яркость
- `color_l1`, `color_temp_l1` - цвет/температура

---

### 🪟 Шторы (Curtains)

**Устройства:**
- main-vadim-window-curtain

**Поля:**
- `position` - позиция (0-100)
- `state` - команды (OPEN/CLOSE/STOP)
- `motor_state` - состояние мотора

**Команды:**
```bash
{"state": "OPEN"}
{"state": "CLOSE"}
{"state": "STOP"}
{"position": 50}
```

---

### 🔘 Кнопки (Buttons) - Read Only

**Устройства:**
- main-vadim-bed-button_curtain
- main-vadim-bed-button_light

**⚠️ Только чтение!** События приходят в топик `/action`

**События:**
- `single` - одиночное нажатие
- `double` - двойное нажатие
- `hold` - удержание
- `release` - отпускание

---

### 📡 Датчики движения (Motion Sensors) - Read Only

**Устройства:**
- main-vadim-bed-motion_sensor
- main-dressingroom-room-motion_sensor
- main-wc1-room-motion_sensor

**Поля:**
- `occupancy` - обнаружено движение (bool)
- `illuminance` - освещенность (lux)
- `battery` - заряд (%)
- `voltage` - напряжение (mV)

---

### 🚪 Датчики контакта (Contact Sensors) - Read Only

**Устройства:**
- main-eduard-bigwardrobe_left-contact_sensor
- main-eduard-bigwardrobe_right-contact_sensor
- main-eduard-smallwardrobe-contact_sensor
- main-eduard-storage-contact_sensor
- main-wc1-door-contact_sensor

**Поля:**
- `contact` - контакт (true=закрыто, false=открыто)
- `battery` - заряд (%)
- `trigger_count` - счетчик срабатываний

---

## 🤖 Автоматизации

### Топик автоматизаций
Все автоматизации находятся в топике `automation/`

**Примеры:**
- `automation/main/wc1/light_auto/status` - статус автоматизации света WC1
- `automation/vadim/bed-button-light/ready` - готовность кнопки света
- `automation/bedroom/wardrobe-motion/status` - статус автоматизации гардеробной

**Поля статуса:**
- `name` - имя автоматизации
- `status` - статус (running/stopped)
- `uptime` - время работы (секунды)
- `triggers_count` - количество срабатываний
- `errors_count` - количество ошибок
- `last_trigger` - последнее срабатывание (timestamp или null)

---

## 📊 Мониторинг

### Общие поля всех устройств
- `last_seen` - последний раз онлайн (ISO timestamp)
- `linkquality` - качество связи (0-255, чем выше - тем лучше)
- `power_outage_count` - счетчик отключений питания
- `update` - информация об обновлениях прошивки

### Качество связи (linkquality)
- **Отлично:** 200-255
- **Хорошо:** 150-199
- **Удовлетворительно:** 100-149
- **Плохо:** 50-99
- **Очень плохо:** 0-49

### Заряд батареи
- **100%** - полностью заряжена
- **50-99%** - норма
- **20-49%** - скоро нужна замена
- **< 20%** - требуется замена

---

## 🔍 Примеры использования

### Получить состояние всех выключателей в комнате Эдуарда
```bash
curl -X GET 'http://localhost:8000/api/mqtt/topics' \
  -H 'Authorization: Bearer {TOKEN}' | \
  jq '.topics | to_entries[] | select(.key | contains("main-eduard")) | {device: .key, state: .value.payload.state}'
```

### Подписаться на события кнопок
```bash
curl -N -H 'Authorization: Bearer {TOKEN}' \
  'http://localhost:8000/api/mqtt/stream?topics=zigbee2mqtt/*-button_*/action'
```

### Включить весь свет в комнате
```bash
# Эдуард - все выключатели
for device in bigwardrobe storage brightlight; do
  curl -X POST 'http://localhost:8000/api/mqtt/publish' \
    -H 'Authorization: Bearer {TOKEN}' \
    -H 'Content-Type: application/json' \
    -d "{\"topic\": \"zigbee2mqtt/main-eduard-${device}-switch/set\", \"payload\": {\"state\": \"ON\"}}"
done

# Включить диммер
curl -X POST 'http://localhost:8000/api/mqtt/publish' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{"topic": "zigbee2mqtt/main-eduard-smallwardrobe-dimmer/set", "payload": {"state": "ON"}}'
```

### Проверить батареи всех датчиков
```bash
curl -X GET 'http://localhost:8000/api/mqtt/topics' \
  -H 'Authorization: Bearer {TOKEN}' | \
  jq '.topics | to_entries[] | select(.value.payload.battery != null) | {device: .key, battery: .value.payload.battery, voltage: .value.payload.voltage}'
```

---

## ⚠️ Важные замечания

1. **Топики automation_devices vs zigbee2mqtt**
   - `automation_devices/` - виртуальные устройства автоматизации (например, Yeelight)
   - `zigbee2mqtt/` - реальные Zigbee устройства

2. **Decoupled mode**
   - Некоторые выключатели имеют `operation_mode: "decoupled"`
   - Это означает, что клавиша не управляет нагрузкой напрямую
   - Используется только для генерации событий в автоматизациях

3. **События actions**
   - Приходят в отдельный топик `{device}/action`
   - Только для чтения, команды не отправляются

4. **Батарейные устройства**
   - Датчики (sensors) и кнопки (buttons) работают от батареек
   - Проверяйте `battery` и `voltage` регулярно
   - Когда батарея садится, может ухудшиться `linkquality`

5. **Качество связи**
   - Все устройства должны иметь `linkquality` > 100
   - Если < 100, возможны проблемы с надежностью
   - Проверьте расположение координаторов Zigbee

---

## 📝 Changelog

**2025-12-19:**
- Создана полная документация по всем 27 Zigbee устройствам
- Добавлены примеры команд для каждого типа устройств
- Описаны все автоматизации
- Добавлен раздел мониторинга
