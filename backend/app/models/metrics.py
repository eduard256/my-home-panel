"""Metrics models."""
from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class TimeRange(str, Enum):
    """Predefined time ranges for metrics queries."""
    HOUR_1 = "1h"
    HOURS_6 = "6h"
    HOURS_24 = "24h"
    DAYS_7 = "7d"
    DAYS_30 = "30d"


class AggregationLevel(str, Enum):
    """Aggregation levels for metrics."""
    RAW = "raw"
    MINUTE = "minute"
    FIVE_MIN = "5min"
    THIRTY_MIN = "30min"
    HOUR = "hour"


class MetricPoint(BaseModel):
    """Single metric data point."""
    timestamp: datetime
    value: float | int | None = None
    # Additional fields based on metric type
    extra: dict[str, Any] = Field(default_factory=dict)


class ServerMetricPoint(BaseModel):
    """Server metric data point."""
    timestamp: datetime
    cpu_percent: float | None = None
    memory_used: int | None = None
    memory_total: int | None = None
    disk_used: int | None = None
    disk_total: int | None = None
    network_in: int | None = None
    network_out: int | None = None
    uptime: int | None = None


class VMMetricPoint(BaseModel):
    """VM/CT metric data point."""
    timestamp: datetime
    status: str | None = None
    cpu_percent: float | None = None
    memory_used: int | None = None
    memory_total: int | None = None
    disk_read: int | None = None
    disk_write: int | None = None
    network_in: int | None = None
    network_out: int | None = None
    uptime: int | None = None


class AutomationMetricPoint(BaseModel):
    """Automation metric data point."""
    timestamp: datetime
    status: str | None = None
    health: str | None = None
    triggers_count: int | None = None
    errors_count: int | None = None
    cpu_percent: float | None = None
    memory_mb: float | None = None


class DeviceStatePoint(BaseModel):
    """Device state data point."""
    timestamp: datetime
    payload: Any


class MetricsResponse(BaseModel):
    """Generic metrics response."""
    id: str  # server_id, vmid, automation_name, topic
    data: list[MetricPoint]
    total: int
    time_range: str | None = None
    aggregation: str | None = None


class ServerMetricsResponse(BaseModel):
    """Server metrics response."""
    server_id: str
    data: list[ServerMetricPoint]
    total: int
    time_range: str | None = None
    aggregation: str | None = None


class VMMetricsResponse(BaseModel):
    """VM metrics response."""
    server_id: str
    vmid: int
    data: list[VMMetricPoint]
    total: int
    time_range: str | None = None
    aggregation: str | None = None


class AutomationMetricsResponse(BaseModel):
    """Automation metrics response."""
    automation_name: str
    data: list[AutomationMetricPoint]
    total: int
    time_range: str | None = None


class DeviceMetricsResponse(BaseModel):
    """Device state history response."""
    topic: str
    data: list[DeviceStatePoint]
    total: int
    time_range: str | None = None
