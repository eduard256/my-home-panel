"""
MQTT router.
Handles topics, publishing, and real-time SSE streaming.
"""
import json
import logging

from fastapi import APIRouter, HTTPException, status, Query
from sse_starlette.sse import EventSourceResponse

from app.auth import CurrentUser, CurrentUserOrToken
from app.services.mqtt_api import get_mqtt_service
from app.models.mqtt import (
    TopicsResponse,
    SingleTopicResponse,
    PublishRequest,
    PublishResponse,
    MQTTHealthResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mqtt", tags=["MQTT"])


@router.get("/health", response_model=MQTTHealthResponse)
async def get_mqtt_health(user: CurrentUser) -> MQTTHealthResponse:
    """
    Get MQTT API health status.
    """
    service = await get_mqtt_service()
    health = await service.get_health()

    if health is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MQTT service unavailable"
        )

    return health


@router.get("/topics", response_model=TopicsResponse)
async def get_topics(user: CurrentUser) -> TopicsResponse:
    """
    Get all cached MQTT topics with their current values.
    """
    service = await get_mqtt_service()
    return await service.get_topics()


@router.get("/topic", response_model=SingleTopicResponse)
async def get_topic(
    user: CurrentUser,
    path: str = Query(..., description="MQTT topic path")
) -> SingleTopicResponse:
    """
    Get single topic from cache.
    """
    service = await get_mqtt_service()
    return await service.get_topic(path)


@router.post("/publish", response_model=PublishResponse)
async def publish_message(
    request: PublishRequest,
    user: CurrentUser
) -> PublishResponse:
    """
    Publish message to MQTT topic.

    The topic should typically end with /set for controlling devices.
    Example: zigbee2mqtt/light_1/set
    """
    service = await get_mqtt_service()
    return await service.publish(request.topic, request.payload)


@router.get("/stream")
async def stream_topics(
    user: CurrentUserOrToken,
    topics: str | None = Query(
        default=None,
        description="Topic filter pattern (e.g., 'zigbee2mqtt/*', 'automation/*')"
    )
) -> EventSourceResponse:
    """
    Server-Sent Events stream for real-time MQTT updates.

    Uses connection pooling - single connection to MQTT API is shared
    across all frontend clients for efficiency.

    Filter patterns:
    - zigbee2mqtt/* - All Zigbee devices
    - automation/* - All automations
    - zigbee2mqtt/light_* - All lights
    - * or empty - All topics

    Multiple patterns can be combined with commas:
    - zigbee2mqtt/*,automation/*
    """
    service = await get_mqtt_service()

    async def event_generator():
        try:
            async for event in service.stream(topics):
                if event.get("type") == "ping":
                    yield {"event": "ping", "data": ""}
                else:
                    yield {
                        "event": "message",
                        "data": json.dumps(event, default=str)
                    }
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())
