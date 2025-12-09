"""Automation Monitor API models."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class ContainerInfo(BaseModel):
    """Docker container information."""
    id: str
    status: str  # running, exited, restarting, etc.
    image: str
    created: datetime | None = None
    started: datetime | None = None
    uptime_seconds: int | None = None


class MQTTStatus(BaseModel):
    """MQTT status information for automation."""
    status: str | None = None  # running, stopped, error
    uptime: int | None = None
    triggers_count: int | None = None
    errors_count: int | None = None
    last_trigger: datetime | None = None
    timestamp: datetime | None = None


class MQTTReadyInfo(BaseModel):
    """MQTT ready info."""
    status: str | None = None
    timestamp: datetime | None = None
    version: str | None = None
    description: str | None = None


class MQTTInfo(BaseModel):
    """Full MQTT info including status, ready, config."""
    status: MQTTStatus | None = None
    ready: MQTTReadyInfo | dict | None = None
    config: dict | None = None
    last_seen: datetime | None = None


class HealthInfo(BaseModel):
    """Automation health information."""
    overall: Literal["healthy", "degraded", "offline", "unhealthy"]
    docker_running: bool
    mqtt_responding: bool


class AutomationInfo(BaseModel):
    """Full automation information."""
    container_name: str
    automation_name: str
    container: ContainerInfo
    mqtt: MQTTInfo | None = None
    health: HealthInfo


class AutomationListResponse(BaseModel):
    """Response for automations list endpoint."""
    automations: list[AutomationInfo]
    total: int
    running: int
    stopped: int


class AutomationActionResponse(BaseModel):
    """Response for automation control actions."""
    success: bool
    action: Literal["start", "stop", "restart"]
    container_name: str
    message: str
    new_status: str | None = None


class AutomationStatsResponse(BaseModel):
    """Container resource stats."""
    container_name: str
    timestamp: datetime
    cpu: dict  # {percent, cores}
    memory: dict  # {used_mb, limit_mb, percent}
    network: dict  # {rx_mb, tx_mb}
    block_io: dict  # {read_mb, write_mb}


class AutomationHealthResponse(BaseModel):
    """Automation API health response."""
    service: str
    status: str
    uptime_seconds: int
    docker_connected: bool
    mqtt_connected: bool
    tracked_automations: int
    timestamp: datetime
