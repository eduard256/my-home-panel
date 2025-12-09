# Pydantic models for API requests and responses
from app.models.auth import LoginRequest, TokenResponse
from app.models.proxmox import (
    ServerInfo,
    ServerStatus,
    ServerListResponse,
    VMInfo,
    VMListResponse,
    VMActionResponse
)
from app.models.frigate import (
    CameraInfo,
    CameraListResponse,
    FrigateEvent,
    EventsResponse,
    FrigateStats
)
from app.models.mqtt import (
    TopicData,
    TopicsResponse,
    PublishRequest,
    PublishResponse
)
from app.models.automation import (
    AutomationInfo,
    AutomationListResponse,
    AutomationActionResponse
)
from app.models.ai import (
    ChatRequest,
    ProcessInfo,
    ProcessListResponse,
    CancelResponse
)
from app.models.metrics import (
    MetricPoint,
    MetricsResponse,
    TimeRange
)

__all__ = [
    # Auth
    "LoginRequest",
    "TokenResponse",
    # Proxmox
    "ServerInfo",
    "ServerStatus",
    "ServerListResponse",
    "VMInfo",
    "VMListResponse",
    "VMActionResponse",
    # Frigate
    "CameraInfo",
    "CameraListResponse",
    "FrigateEvent",
    "EventsResponse",
    "FrigateStats",
    # MQTT
    "TopicData",
    "TopicsResponse",
    "PublishRequest",
    "PublishResponse",
    # Automation
    "AutomationInfo",
    "AutomationListResponse",
    "AutomationActionResponse",
    # AI
    "ChatRequest",
    "ProcessInfo",
    "ProcessListResponse",
    "CancelResponse",
    # Metrics
    "MetricPoint",
    "MetricsResponse",
    "TimeRange"
]
