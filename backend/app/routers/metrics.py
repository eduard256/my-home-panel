"""
Metrics router.
Handles historical metrics for servers, VMs, automations, and devices.
"""
import logging
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, status, Query

from app.auth import CurrentUser
from app.database import (
    get_server_metrics,
    get_vm_metrics,
    get_automation_metrics,
    get_device_states
)
from app.models.metrics import (
    TimeRange,
    ServerMetricsResponse,
    ServerMetricPoint,
    VMMetricsResponse,
    VMMetricPoint,
    AutomationMetricsResponse,
    AutomationMetricPoint,
    DeviceMetricsResponse,
    DeviceStatePoint
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


def parse_time_range(time_range: TimeRange) -> tuple[datetime, datetime]:
    """Convert time range enum to start/end datetimes."""
    now = datetime.utcnow()

    if time_range == TimeRange.HOUR_1:
        start = now - timedelta(hours=1)
    elif time_range == TimeRange.HOURS_6:
        start = now - timedelta(hours=6)
    elif time_range == TimeRange.HOURS_24:
        start = now - timedelta(hours=24)
    elif time_range == TimeRange.DAYS_7:
        start = now - timedelta(days=7)
    elif time_range == TimeRange.DAYS_30:
        start = now - timedelta(days=30)
    else:
        start = now - timedelta(hours=1)

    return start, now


def get_aggregation_for_range(time_range: TimeRange) -> str | None:
    """Determine appropriate aggregation level for time range."""
    if time_range == TimeRange.HOUR_1:
        return "raw"
    elif time_range == TimeRange.HOURS_6:
        return "minute"
    elif time_range == TimeRange.HOURS_24:
        return "5min"
    elif time_range == TimeRange.DAYS_7:
        return "30min"
    elif time_range == TimeRange.DAYS_30:
        return "hour"
    return None


@router.get("/server/{server_id}", response_model=ServerMetricsResponse)
async def get_server_metrics_endpoint(
    server_id: str,
    user: CurrentUser,
    time_range: TimeRange = Query(default=TimeRange.HOUR_1, description="Time range for metrics"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Maximum data points")
) -> ServerMetricsResponse:
    """
    Get historical metrics for a Proxmox server.

    Returns CPU, memory, disk, and network metrics for the specified time range.
    Aggregation level is automatically selected based on time range.
    """
    start_time, end_time = parse_time_range(time_range)
    aggregation = get_aggregation_for_range(time_range)

    metrics = await get_server_metrics(
        server_id=server_id,
        start_time=start_time,
        end_time=end_time,
        aggregation_level=aggregation,
        limit=limit
    )

    data = []
    for m in metrics:
        data.append(ServerMetricPoint(
            timestamp=m["timestamp"] if isinstance(m["timestamp"], datetime)
            else datetime.fromisoformat(str(m["timestamp"])),
            cpu_percent=m.get("cpu_percent"),
            memory_used=m.get("memory_used"),
            memory_total=m.get("memory_total"),
            disk_used=m.get("disk_used"),
            disk_total=m.get("disk_total"),
            network_in=m.get("network_in"),
            network_out=m.get("network_out"),
            uptime=m.get("uptime")
        ))

    return ServerMetricsResponse(
        server_id=server_id,
        data=data,
        total=len(data),
        time_range=time_range.value,
        aggregation=aggregation
    )


@router.get("/vm/{server_id}/{vmid}", response_model=VMMetricsResponse)
async def get_vm_metrics_endpoint(
    server_id: str,
    vmid: int,
    user: CurrentUser,
    time_range: TimeRange = Query(default=TimeRange.HOUR_1, description="Time range for metrics"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Maximum data points")
) -> VMMetricsResponse:
    """
    Get historical metrics for a VM or container.

    Returns CPU, memory, disk I/O, and network metrics.
    """
    start_time, end_time = parse_time_range(time_range)
    aggregation = get_aggregation_for_range(time_range)

    metrics = await get_vm_metrics(
        server_id=server_id,
        vmid=vmid,
        start_time=start_time,
        end_time=end_time,
        aggregation_level=aggregation,
        limit=limit
    )

    data = []
    for m in metrics:
        data.append(VMMetricPoint(
            timestamp=m["timestamp"] if isinstance(m["timestamp"], datetime)
            else datetime.fromisoformat(str(m["timestamp"])),
            status=m.get("status"),
            cpu_percent=m.get("cpu_percent"),
            memory_used=m.get("memory_used"),
            memory_total=m.get("memory_total"),
            disk_read=m.get("disk_read"),
            disk_write=m.get("disk_write"),
            network_in=m.get("network_in"),
            network_out=m.get("network_out"),
            uptime=m.get("uptime")
        ))

    return VMMetricsResponse(
        server_id=server_id,
        vmid=vmid,
        data=data,
        total=len(data),
        time_range=time_range.value,
        aggregation=aggregation
    )


@router.get("/automation/{name}", response_model=AutomationMetricsResponse)
async def get_automation_metrics_endpoint(
    name: str,
    user: CurrentUser,
    time_range: TimeRange = Query(default=TimeRange.HOUR_1, description="Time range for metrics"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Maximum data points")
) -> AutomationMetricsResponse:
    """
    Get historical metrics for an automation.

    Returns status, health, trigger counts, error counts, and resource usage.
    """
    start_time, end_time = parse_time_range(time_range)

    metrics = await get_automation_metrics(
        automation_name=name,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )

    data = []
    for m in metrics:
        data.append(AutomationMetricPoint(
            timestamp=m["timestamp"] if isinstance(m["timestamp"], datetime)
            else datetime.fromisoformat(str(m["timestamp"])),
            status=m.get("status"),
            health=m.get("health"),
            triggers_count=m.get("triggers_count"),
            errors_count=m.get("errors_count"),
            cpu_percent=m.get("cpu_percent"),
            memory_mb=m.get("memory_mb")
        ))

    return AutomationMetricsResponse(
        automation_name=name,
        data=data,
        total=len(data),
        time_range=time_range.value
    )


@router.get("/device/{topic:path}", response_model=DeviceMetricsResponse)
async def get_device_metrics_endpoint(
    topic: str,
    user: CurrentUser,
    time_range: TimeRange = Query(default=TimeRange.HOUR_1, description="Time range for metrics"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Maximum data points")
) -> DeviceMetricsResponse:
    """
    Get historical state changes for a smart home device.

    The topic should be the full MQTT topic path.
    Example: zigbee2mqtt/main-eduard-bigwardrobe-switch
    """
    start_time, end_time = parse_time_range(time_range)

    states = await get_device_states(
        topic=topic,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )

    data = []
    for s in states:
        # Parse payload if it's a string
        payload = s.get("payload")
        if isinstance(payload, str):
            try:
                import json
                payload = json.loads(payload)
            except:
                pass

        data.append(DeviceStatePoint(
            timestamp=s["timestamp"] if isinstance(s["timestamp"], datetime)
            else datetime.fromisoformat(str(s["timestamp"])),
            payload=payload
        ))

    return DeviceMetricsResponse(
        topic=topic,
        data=data,
        total=len(data),
        time_range=time_range.value
    )
