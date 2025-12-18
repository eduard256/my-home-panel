"""
Automations router.
Handles automation status, control, and logs streaming.
"""
import json
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, status, Query
from sse_starlette.sse import EventSourceResponse

from app.auth import CurrentUser
from app.services.automation import get_automation_service
from app.models.automation import (
    AutomationInfo,
    AutomationListResponse,
    AutomationActionResponse,
    AutomationStatsResponse,
    AutomationHealthResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automations", tags=["Automations"])


@router.get("/health", response_model=AutomationHealthResponse)
async def get_automation_health(user: CurrentUser) -> AutomationHealthResponse:
    """
    Get Automation Monitor API health status.
    """
    service = await get_automation_service()
    health = await service.get_health()

    if health is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Automation service unavailable"
        )

    return health


@router.get("", response_model=AutomationListResponse)
async def get_automations(user: CurrentUser) -> AutomationListResponse:
    """
    Get all automations with their current status.
    Includes container info, MQTT status, and health.
    """
    service = await get_automation_service()
    return await service.get_automations()


@router.get("/stats/all", response_model=list[AutomationStatsResponse])
async def get_all_stats(user: CurrentUser) -> list[AutomationStatsResponse]:
    """
    Get resource stats for all automation containers.

    Warning: This can take 15-20 seconds for many containers
    due to Docker API limitations.
    """
    service = await get_automation_service()
    stats = await service.get_stats()

    if stats is None or not isinstance(stats, list):
        return []

    return stats


@router.get("/{name:path}/logs")
async def stream_automation_logs(
    name: str,
    user: CurrentUser,
    lines: int = Query(default=100, ge=0, le=1000, description="Number of historical lines")
) -> EventSourceResponse:
    """
    Stream logs from automation container via SSE.

    Returns historical logs first, then streams new logs in real-time.
    Each event has type 'log' for log lines or 'ping' for keepalive.
    """
    service = await get_automation_service()

    async def event_generator():
        try:
            async for log_line in service.stream_logs(name, lines):
                try:
                    data = json.loads(log_line)
                    if data.get("type") == "ping":
                        yield {"event": "ping", "data": ""}
                    else:
                        yield {"event": "log", "data": log_line}
                except json.JSONDecodeError:
                    yield {"event": "log", "data": log_line}
        except Exception as e:
            logger.error(f"Log stream error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())


@router.get("/{name}/stats", response_model=AutomationStatsResponse)
async def get_automation_stats(
    name: str,
    user: CurrentUser
) -> AutomationStatsResponse:
    """
    Get resource stats for an automation container.
    Includes CPU, memory, network, and disk I/O.
    """
    service = await get_automation_service()
    stats = await service.get_stats(name)

    if stats is None or isinstance(stats, list):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stats not available for '{name}'"
        )

    return stats


@router.get("/{name:path}", response_model=AutomationInfo)
async def get_automation(
    name: str,
    user: CurrentUser
) -> AutomationInfo:
    """
    Get single automation by name.
    Name can be either automation_name or container_name.
    """
    service = await get_automation_service()
    automation = await service.get_automation(name)

    if automation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation '{name}' not found"
        )

    return automation


@router.post("/{name:path}/{action}", response_model=AutomationActionResponse)
async def control_automation(
    name: str,
    action: Literal["start", "stop", "restart"],
    user: CurrentUser
) -> AutomationActionResponse:
    """
    Control automation container.

    Actions:
    - start: Start stopped container
    - stop: Stop running container
    - restart: Restart container

    Note: The 'monitor' container cannot be controlled via API.
    """
    service = await get_automation_service()
    result = await service.control_automation(name, action)

    if not result.success:
        # Check if it's a "cannot restart monitor" error
        if "монитор" in result.message.lower() or "monitor" in result.message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.message
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )

    return result
