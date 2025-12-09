"""
MQTT API client service with SSE connection pooling.
Handles communication with MQTT API Gateway.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, AsyncGenerator

import httpx

from app.config import get_settings
from app.models.mqtt import (
    TopicData,
    TopicsResponse,
    SingleTopicResponse,
    PublishResponse,
    MQTTHealthResponse
)

logger = logging.getLogger(__name__)


class MQTTAPIClient:
    """Async client for MQTT API Gateway."""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.auth = (username, password)
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                auth=self.auth,
                timeout=30.0
            )
        return self._client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> dict | None:
        """Make API request with error handling."""
        client = await self._get_client()
        try:
            response = await client.request(method, endpoint, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"MQTT API error: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            logger.error(f"MQTT API request error: {e}")
            return None
        except Exception as e:
            logger.error(f"MQTT API unexpected error: {e}")
            return None

    async def get_health(self) -> MQTTHealthResponse | None:
        """Get MQTT API health status."""
        data = await self._request("GET", "/api/v1/health")
        if data is None:
            return None
        return MQTTHealthResponse(
            status=data.get("status", "unknown"),
            mqtt_connected=data.get("mqtt_connected", False),
            cache_size=data.get("cache_size", 0),
            uptime_seconds=data.get("uptime_seconds", 0),
            sse_subscribers=data.get("sse_subscribers", 0)
        )

    async def get_topics(self) -> TopicsResponse:
        """Get all cached topics."""
        data = await self._request("GET", "/api/v1/topics")
        if data is None:
            return TopicsResponse(topics={}, total=0)

        topics: dict[str, TopicData] = {}
        for topic_path, topic_info in data.get("topics", {}).items():
            topics[topic_path] = TopicData(
                topic=topic_info.get("topic", topic_path),
                payload=topic_info.get("payload"),
                timestamp=datetime.fromisoformat(topic_info["timestamp"])
                if topic_info.get("timestamp") else datetime.utcnow()
            )

        return TopicsResponse(
            topics=topics,
            total=data.get("total", len(topics))
        )

    async def get_topic(self, topic_path: str) -> SingleTopicResponse:
        """Get single topic from cache."""
        data = await self._request(
            "GET",
            "/api/v1/topic",
            params={"path": topic_path}
        )

        if data is None:
            return SingleTopicResponse(
                success=False,
                error="Failed to fetch topic"
            )

        if not data.get("success", False):
            return SingleTopicResponse(
                success=False,
                error=data.get("error")
            )

        topic_info = data.get("data", {})
        return SingleTopicResponse(
            success=True,
            data=TopicData(
                topic=topic_info.get("topic", topic_path),
                payload=topic_info.get("payload"),
                timestamp=datetime.fromisoformat(topic_info["timestamp"])
                if topic_info.get("timestamp") else datetime.utcnow()
            )
        )

    async def publish(self, topic: str, payload: Any) -> PublishResponse:
        """Publish message to MQTT topic."""
        data = await self._request(
            "POST",
            "/api/v1/topic",
            params={"path": topic},
            json=payload
        )

        if data is None:
            return PublishResponse(
                success=False,
                topic=topic,
                error="Failed to publish"
            )

        return PublishResponse(
            success=data.get("success", False),
            topic=data.get("topic", topic),
            error=data.get("error")
        )


class MQTTSSEPool:
    """
    SSE Connection Pool for MQTT streams.
    Maintains a single connection to MQTT API and distributes events to multiple subscribers.
    """

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.auth = httpx.BasicAuth(username, password)

        self._subscribers: list[asyncio.Queue] = []
        self._sse_task: asyncio.Task | None = None
        self._running = False
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        """Start SSE connection if not already running."""
        async with self._lock:
            if self._running:
                return

            self._running = True
            self._sse_task = asyncio.create_task(self._sse_loop())
            logger.info("Started MQTT SSE pool")

    async def stop(self) -> None:
        """Stop SSE connection."""
        async with self._lock:
            self._running = False

            if self._sse_task:
                self._sse_task.cancel()
                try:
                    await self._sse_task
                except asyncio.CancelledError:
                    pass
                self._sse_task = None

            # Clear all subscriber queues
            for queue in self._subscribers:
                while not queue.empty():
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break

            self._subscribers.clear()
            logger.info("Stopped MQTT SSE pool")

    async def subscribe(
        self,
        topics_filter: str | None = None
    ) -> AsyncGenerator[dict, None]:
        """
        Subscribe to SSE events.
        Returns an async generator that yields events.
        """
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)

        async with self._lock:
            self._subscribers.append(queue)

        # Ensure SSE connection is running
        await self.start()

        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)

                    # Apply filter if specified
                    if topics_filter and event.get("topic"):
                        if not self._match_filter(event["topic"], topics_filter):
                            continue

                    yield event

                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {"type": "ping"}

        except asyncio.CancelledError:
            pass
        finally:
            async with self._lock:
                if queue in self._subscribers:
                    self._subscribers.remove(queue)

    def _match_filter(self, topic: str, pattern: str) -> bool:
        """Check if topic matches filter pattern."""
        patterns = pattern.split(",")
        for p in patterns:
            p = p.strip()
            if p == "*":
                return True
            if p.endswith("*"):
                prefix = p[:-1]
                if topic.startswith(prefix):
                    return True
            elif topic == p:
                return True
        return False

    async def _sse_loop(self) -> None:
        """Main SSE connection loop with auto-reconnect."""
        stream_url = f"{self.base_url}/api/v1/stream"

        while self._running:
            try:
                async with httpx.AsyncClient(auth=self.auth, timeout=None) as client:
                    async with client.stream("GET", stream_url) as response:
                        logger.info("MQTT SSE connection established")

                        async for line in response.aiter_lines():
                            if not self._running:
                                break

                            if not line:
                                continue

                            if line.startswith("data:"):
                                data_str = line[5:].strip()
                                if not data_str:
                                    continue

                                try:
                                    event = json.loads(data_str)
                                    await self._broadcast(event)
                                except json.JSONDecodeError:
                                    logger.warning(f"Failed to parse SSE data: {data_str[:100]}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"MQTT SSE connection error: {e}")
                if self._running:
                    # Wait before reconnecting
                    await asyncio.sleep(5)

    async def _broadcast(self, event: dict) -> None:
        """Broadcast event to all subscribers."""
        dead_queues = []

        for queue in self._subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Queue is full, drop the event for this subscriber
                logger.warning("Subscriber queue full, dropping event")
            except Exception:
                dead_queues.append(queue)

        # Remove dead queues
        if dead_queues:
            async with self._lock:
                for q in dead_queues:
                    if q in self._subscribers:
                        self._subscribers.remove(q)


class MQTTService:
    """High-level service for MQTT API operations."""

    def __init__(self):
        self._client: MQTTAPIClient | None = None
        self._sse_pool: MQTTSSEPool | None = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize MQTT client and SSE pool."""
        if self._initialized:
            return

        settings = get_settings()

        self._client = MQTTAPIClient(
            base_url=settings.MQTT_API_URL,
            username=settings.MQTT_API_USER,
            password=settings.MQTT_API_PASSWORD
        )

        self._sse_pool = MQTTSSEPool(
            base_url=settings.MQTT_API_URL,
            username=settings.MQTT_API_USER,
            password=settings.MQTT_API_PASSWORD
        )

        self._initialized = True
        logger.info(f"Initialized MQTT service: {settings.MQTT_API_URL}")

    async def close(self) -> None:
        """Close MQTT client and SSE pool."""
        if self._client:
            await self._client.close()
            self._client = None

        if self._sse_pool:
            await self._sse_pool.stop()
            self._sse_pool = None

        self._initialized = False

    async def get_health(self) -> MQTTHealthResponse | None:
        """Get MQTT API health status."""
        if self._client is None:
            return None
        return await self._client.get_health()

    async def get_topics(self) -> TopicsResponse:
        """Get all cached topics."""
        if self._client is None:
            return TopicsResponse(topics={}, total=0)
        return await self._client.get_topics()

    async def get_topic(self, topic_path: str) -> SingleTopicResponse:
        """Get single topic from cache."""
        if self._client is None:
            return SingleTopicResponse(success=False, error="Not initialized")
        return await self._client.get_topic(topic_path)

    async def publish(self, topic: str, payload: Any) -> PublishResponse:
        """Publish message to MQTT topic."""
        if self._client is None:
            return PublishResponse(success=False, topic=topic, error="Not initialized")
        return await self._client.publish(topic, payload)

    async def stream(
        self,
        topics_filter: str | None = None
    ) -> AsyncGenerator[dict, None]:
        """
        Subscribe to real-time MQTT events via SSE.
        Uses connection pooling - single connection to MQTT API shared by all subscribers.
        """
        if self._sse_pool is None:
            return

        async for event in self._sse_pool.subscribe(topics_filter):
            yield event


# Singleton instance
_mqtt_service: MQTTService | None = None


async def get_mqtt_service() -> MQTTService:
    """Get MQTT service singleton."""
    global _mqtt_service
    if _mqtt_service is None:
        _mqtt_service = MQTTService()
        await _mqtt_service.initialize()
    return _mqtt_service


async def close_mqtt_service() -> None:
    """Close MQTT service."""
    global _mqtt_service
    if _mqtt_service is not None:
        await _mqtt_service.close()
        _mqtt_service = None
