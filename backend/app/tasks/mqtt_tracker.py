"""
MQTT State Tracker.
Subscribes to MQTT SSE stream and stores device state changes.
"""
import asyncio
import json
import logging

from app.config import get_settings
from app.database import insert_device_state

logger = logging.getLogger(__name__)

# Global task reference
_tracker_task: asyncio.Task | None = None
_running = False


async def start_mqtt_tracker() -> None:
    """Start MQTT state tracking task."""
    global _tracker_task, _running

    if _running:
        return

    _running = True
    _tracker_task = asyncio.create_task(_mqtt_tracking_loop())
    logger.info("MQTT state tracker started")


async def stop_mqtt_tracker() -> None:
    """Stop MQTT state tracking task."""
    global _tracker_task, _running

    _running = False

    if _tracker_task is not None:
        _tracker_task.cancel()
        try:
            await _tracker_task
        except asyncio.CancelledError:
            pass
        _tracker_task = None

    logger.info("MQTT state tracker stopped")


async def _mqtt_tracking_loop() -> None:
    """Main loop for MQTT state tracking with auto-reconnect."""
    import httpx

    settings = get_settings()
    stream_url = f"{settings.MQTT_API_URL}/api/v1/stream"
    auth = httpx.BasicAuth(settings.MQTT_API_USER, settings.MQTT_API_PASSWORD)

    while _running:
        try:
            async with httpx.AsyncClient(auth=auth, timeout=None) as client:
                async with client.stream("GET", stream_url) as response:
                    logger.info("MQTT tracker connected to SSE stream")

                    async for line in response.aiter_lines():
                        if not _running:
                            break

                        if not line or not line.startswith("data:"):
                            continue

                        data_str = line[5:].strip()
                        if not data_str:
                            continue

                        try:
                            event = json.loads(data_str)
                            await _process_mqtt_event(event)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse MQTT event: {data_str[:100]}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"MQTT tracker connection error: {e}")
            if _running:
                # Wait before reconnecting
                await asyncio.sleep(5)


async def _process_mqtt_event(event: dict) -> None:
    """Process incoming MQTT event and store state change."""
    topic = event.get("topic")
    payload = event.get("payload")

    if not topic or payload is None:
        return

    # Filter: only store certain topics
    # Exclude system topics and command topics
    if _should_store_topic(topic):
        try:
            # Convert payload to JSON string for storage
            payload_str = json.dumps(payload) if isinstance(payload, dict) else str(payload)

            await insert_device_state(
                topic=topic,
                payload=payload_str
            )
            logger.debug(f"Stored state change for {topic}")
        except Exception as e:
            logger.error(f"Failed to store state for {topic}: {e}")


def _should_store_topic(topic: str) -> bool:
    """
    Determine if a topic should be stored in history.

    Returns True for device state topics.
    Returns False for system, bridge, and command topics.
    """
    # Exclude patterns
    exclude_patterns = [
        "homeassistant/",  # HA auto-discovery
        "zigbee2mqtt/bridge/",  # Z2M bridge system
        "/set",  # Command topics
        "/get",
        "/cmd",
        "/config",  # Configuration topics
        "/availability",  # Online/offline status (too frequent)
    ]

    for pattern in exclude_patterns:
        if pattern in topic:
            return False

    # Include patterns (device state topics)
    include_prefixes = [
        "zigbee2mqtt/",  # Zigbee devices
        "automation/",  # Automation status
    ]

    for prefix in include_prefixes:
        if topic.startswith(prefix):
            return True

    return False
