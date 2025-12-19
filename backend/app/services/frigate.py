"""
Frigate NVR API client service.
Handles communication with Frigate for cameras, events, and snapshots.
"""
import logging
from typing import Any

import httpx

from app.config import get_settings
from app.models.frigate import (
    CameraInfo,
    CameraListResponse,
    FrigateEvent,
    EventsResponse,
    FrigateStats,
    CameraStats,
    DetectorStats
)

logger = logging.getLogger(__name__)


class FrigateClient:
    """Async client for Frigate NVR API."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
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
    ) -> dict | list | None:
        """Make API request with error handling."""
        client = await self._get_client()
        try:
            response = await client.request(method, endpoint, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Frigate API error: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Frigate request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Frigate unexpected error: {e}")
            return None

    async def get_config(self) -> dict | list | None:
        """Get Frigate configuration."""
        return await self._request("GET", "/api/config")

    async def get_stats(self) -> dict | list | None:
        """Get Frigate system stats."""
        return await self._request("GET", "/api/stats")

    async def get_events(
        self,
        camera: str | None = None,
        label: str | None = None,
        before: int | None = None,
        after: int | None = None,
        limit: int = 50,
        has_clip: bool | None = None,
        has_snapshot: bool | None = None,
        include_thumbnails: int = 0
    ) -> dict | list | None:
        """Get detection events with optional filters."""
        params: dict[str, Any] = {
            "limit": limit,
            "include_thumbnails": include_thumbnails
        }

        if camera:
            params["camera"] = camera
        if label:
            params["label"] = label
        if before:
            params["before"] = before
        if after:
            params["after"] = after
        if has_clip is not None:
            params["has_clip"] = int(has_clip)
        if has_snapshot is not None:
            params["has_snapshot"] = int(has_snapshot)

        return await self._request("GET", "/api/events", params=params)

    async def get_snapshot(
        self,
        camera: str,
        quality: int = 70,
        height: int | None = None
    ) -> bytes | None:
        """Get camera snapshot as bytes."""
        client = await self._get_client()
        try:
            params: dict[str, Any] = {"quality": quality}
            if height:
                params["height"] = height

            response = await client.get(f"/api/{camera}/latest.jpg", params=params)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Error getting snapshot for {camera}: {e}")
            return None

    async def get_event_thumbnail(self, event_id: str) -> bytes | None:
        """Get thumbnail for an event."""
        client = await self._get_client()
        try:
            response = await client.get(f"/api/events/{event_id}/thumbnail.jpg")
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Error getting thumbnail for event {event_id}: {e}")
            return None

    async def get_event_snapshot(self, event_id: str) -> bytes | None:
        """Get snapshot for an event."""
        client = await self._get_client()
        try:
            response = await client.get(f"/api/events/{event_id}/snapshot.jpg")
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Error getting snapshot for event {event_id}: {e}")
            return None


class FrigateService:
    """High-level service for Frigate NVR operations."""

    def __init__(self):
        self._client: FrigateClient | None = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize Frigate client."""
        if self._initialized:
            return

        settings = get_settings()
        self._client = FrigateClient(settings.FRIGATE_URL)
        self._initialized = True
        logger.info(f"Initialized Frigate client: {settings.FRIGATE_URL}")

    async def close(self) -> None:
        """Close Frigate client."""
        if self._client is not None:
            await self._client.close()
            self._client = None
        self._initialized = False

    async def get_cameras(self) -> CameraListResponse:
        """Get list of all configured cameras."""
        if self._client is None:
            return CameraListResponse(cameras=[], total=0)

        config = await self._client.get_config()
        if config is None or not isinstance(config, dict):
            return CameraListResponse(cameras=[], total=0)

        cameras: list[CameraInfo] = []
        cameras_config = config.get("cameras", {})

        for name, cam_config in cameras_config.items():
            detect_config = cam_config.get("detect", {})
            record_config = cam_config.get("record", {})
            snapshots_config = cam_config.get("snapshots", {})
            audio_config = cam_config.get("audio", {})

            cameras.append(CameraInfo(
                name=name,
                enabled=cam_config.get("enabled", True),
                detect_enabled=detect_config.get("enabled", True),
                record_enabled=record_config.get("enabled", False),
                snapshots_enabled=snapshots_config.get("enabled", False),
                audio_enabled=audio_config.get("enabled", False),
                width=detect_config.get("width"),
                height=detect_config.get("height"),
                fps=detect_config.get("fps")
            ))

        return CameraListResponse(
            cameras=cameras,
            total=len(cameras)
        )

    async def get_camera_snapshot(
        self,
        camera: str,
        quality: int = 70,
        height: int | None = None
    ) -> bytes | None:
        """Get snapshot for a specific camera."""
        if self._client is None:
            return None
        return await self._client.get_snapshot(camera, quality, height)

    async def get_events(
        self,
        camera: str | None = None,
        label: str | None = None,
        before: int | None = None,
        after: int | None = None,
        limit: int = 50,
        has_clip: bool | None = None,
        has_snapshot: bool | None = None
    ) -> EventsResponse:
        """Get detection events with optional filters."""
        if self._client is None:
            return EventsResponse(events=[], total=0)

        events_raw = await self._client.get_events(
            camera=camera,
            label=label,
            before=before,
            after=after,
            limit=limit,
            has_clip=has_clip,
            has_snapshot=has_snapshot
        )

        if events_raw is None:
            return EventsResponse(events=[], total=0)

        events: list[FrigateEvent] = []
        for ev in events_raw:
            events.append(FrigateEvent(
                id=ev.get("id"),
                camera=ev.get("camera"),
                label=ev.get("label"),
                sub_label=ev.get("sub_label"),
                score=ev.get("score", 0),
                top_score=ev.get("top_score"),
                false_positive=ev.get("false_positive"),
                start_time=ev.get("start_time"),
                end_time=ev.get("end_time"),
                has_clip=ev.get("has_clip", False),
                has_snapshot=ev.get("has_snapshot", False),
                thumbnail=ev.get("thumbnail"),
                zones=ev.get("zones", []),
                region=ev.get("region"),
                box=ev.get("box"),
                area=ev.get("area")
            ))

        return EventsResponse(
            events=events,
            total=len(events)
        )

    async def get_event_thumbnail(self, event_id: str) -> bytes | None:
        """Get thumbnail for an event."""
        if self._client is None:
            return None
        return await self._client.get_event_thumbnail(event_id)

    async def get_event_snapshot(self, event_id: str) -> bytes | None:
        """Get snapshot for an event."""
        if self._client is None:
            return None
        return await self._client.get_event_snapshot(event_id)

    async def get_stats(self) -> FrigateStats | None:
        """Get Frigate system stats."""
        if self._client is None:
            return None

        stats_raw = await self._client.get_stats()
        if stats_raw is None or not isinstance(stats_raw, dict):
            return None

        # Parse camera stats
        cameras_stats: dict[str, CameraStats] = {}
        for cam_name, cam_stats in stats_raw.get("cameras", {}).items():
            cameras_stats[cam_name] = CameraStats(
                camera_fps=cam_stats.get("camera_fps", 0),
                detection_fps=cam_stats.get("detection_fps", 0),
                capture_pid=cam_stats.get("capture_pid"),
                process_fps=cam_stats.get("process_fps"),
                skipped_fps=cam_stats.get("skipped_fps"),
                detection_enabled=cam_stats.get("detection_enabled")
            )

        # Parse detector stats
        detectors_stats: dict[str, DetectorStats] = {}
        for det_name, det_stats in stats_raw.get("detectors", {}).items():
            detectors_stats[det_name] = DetectorStats(
                inference_speed=det_stats.get("inference_speed", 0),
                detection_start=det_stats.get("detection_start"),
                pid=det_stats.get("pid")
            )

        return FrigateStats(
            cameras=cameras_stats,
            detectors=detectors_stats,
            detection_fps=stats_raw.get("detection_fps"),
            cpu_usages=stats_raw.get("cpu_usages"),
            gpu_usages=stats_raw.get("gpu_usages"),
            service=stats_raw.get("service")
        )


# Singleton instance
_frigate_service: FrigateService | None = None


async def get_frigate_service() -> FrigateService:
    """Get Frigate service singleton."""
    global _frigate_service
    if _frigate_service is None:
        _frigate_service = FrigateService()
        await _frigate_service.initialize()
    return _frigate_service


async def close_frigate_service() -> None:
    """Close Frigate service."""
    global _frigate_service
    if _frigate_service is not None:
        await _frigate_service.close()
        _frigate_service = None
