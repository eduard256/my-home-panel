"""
Frigate router.
Handles camera snapshots, events, and stats.
"""
import logging

from fastapi import APIRouter, HTTPException, status, Query, Response

from app.auth import CurrentUser
from app.services.frigate import get_frigate_service
from app.models.frigate import (
    CameraListResponse,
    EventsResponse,
    FrigateStats
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/frigate", tags=["Frigate"])


@router.get("/cameras", response_model=CameraListResponse)
async def get_cameras(user: CurrentUser) -> CameraListResponse:
    """
    Get list of all configured cameras.
    """
    service = await get_frigate_service()
    return await service.get_cameras()


@router.get("/cameras/{camera_name}/snapshot")
async def get_camera_snapshot(
    camera_name: str,
    user: CurrentUser,
    quality: int = Query(default=70, ge=1, le=100, description="JPEG quality"),
    height: int | None = Query(default=None, description="Resize to this height")
) -> Response:
    """
    Get latest snapshot from a camera.
    Returns JPEG image.
    """
    service = await get_frigate_service()
    image_bytes = await service.get_camera_snapshot(camera_name, quality, height)

    if image_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera '{camera_name}' not found or snapshot not available"
        )

    return Response(
        content=image_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/events", response_model=EventsResponse)
async def get_events(
    user: CurrentUser,
    camera: str | None = Query(default=None, description="Filter by camera"),
    label: str | None = Query(default=None, description="Filter by label (person, car, etc.)"),
    before: int | None = Query(default=None, description="Events before this Unix timestamp"),
    after: int | None = Query(default=None, description="Events after this Unix timestamp"),
    limit: int = Query(default=50, ge=1, le=500, description="Maximum events to return"),
    has_clip: bool | None = Query(default=None, description="Filter by has_clip"),
    has_snapshot: bool | None = Query(default=None, description="Filter by has_snapshot")
) -> EventsResponse:
    """
    Get detection events with optional filters.
    """
    service = await get_frigate_service()
    return await service.get_events(
        camera=camera,
        label=label,
        before=before,
        after=after,
        limit=limit,
        has_clip=has_clip,
        has_snapshot=has_snapshot
    )


@router.get("/events/{event_id}/thumbnail")
async def get_event_thumbnail(
    event_id: str,
    user: CurrentUser
) -> Response:
    """
    Get thumbnail for a specific event.
    Returns JPEG image.
    """
    service = await get_frigate_service()
    image_bytes = await service.get_event_thumbnail(event_id)

    if image_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thumbnail not found for event '{event_id}'"
        )

    return Response(
        content=image_bytes,
        media_type="image/jpeg"
    )


@router.get("/events/{event_id}/snapshot")
async def get_event_snapshot(
    event_id: str,
    user: CurrentUser
) -> Response:
    """
    Get snapshot for a specific event.
    Returns JPEG image.
    """
    service = await get_frigate_service()
    image_bytes = await service.get_event_snapshot(event_id)

    if image_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Snapshot not found for event '{event_id}'"
        )

    return Response(
        content=image_bytes,
        media_type="image/jpeg"
    )


@router.get("/stats", response_model=FrigateStats)
async def get_stats(user: CurrentUser) -> FrigateStats:
    """
    Get Frigate system stats including:
    - Per-camera FPS and detection stats
    - Detector inference speeds
    - CPU/GPU usage
    """
    service = await get_frigate_service()
    stats = await service.get_stats()

    if stats is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Frigate service unavailable"
        )

    return stats
