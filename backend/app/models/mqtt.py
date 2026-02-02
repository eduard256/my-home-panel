# ===========================================================================
# DEPRECATED: This file is part of the legacy Smart Home implementation.
# It is still functional but will be removed once the new WebSocket-based
# Smart Home system (Smart Home New) is fully implemented.
# All new development should use the WebSocket proxy in mqtt_ws.py.
# ===========================================================================
"""MQTT API models."""
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class TopicData(BaseModel):
    """Single topic data."""
    topic: str
    payload: Any  # Can be dict, string, number, etc.
    timestamp: datetime


class TopicsResponse(BaseModel):
    """Response for topics list endpoint."""
    topics: dict[str, TopicData]
    total: int


class SingleTopicResponse(BaseModel):
    """Response for single topic endpoint."""
    success: bool
    data: TopicData | None = None
    error: str | None = None


class PublishRequest(BaseModel):
    """Request to publish MQTT message."""
    topic: str
    payload: Any  # Can be dict, string, number, etc.


class PublishResponse(BaseModel):
    """Response for publish endpoint."""
    success: bool
    topic: str
    error: str | None = None


class MQTTHealthResponse(BaseModel):
    """MQTT API health response."""
    status: str
    mqtt_connected: bool
    cache_size: int
    uptime_seconds: int
    sse_subscribers: int


class SSEMessage(BaseModel):
    """Server-Sent Event message from MQTT stream."""
    topic: str
    payload: Any
    timestamp: datetime
