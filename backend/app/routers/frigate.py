"""
Frigate router.
Handles camera snapshots, events, and stats.
Also proxies go2rtc WebRTC streaming with authentication.
"""
import logging

import httpx
from fastapi import APIRouter, HTTPException, status, Query, Response, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, FileResponse

from app.auth import CurrentUser, CurrentUserOrToken, OptionalUser, verify_jwt
from app.config import get_settings
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


# ============================================================================
# go2rtc WebRTC Proxy (with authentication)
# ============================================================================


@router.get("/go2rtc/stream.html")
async def get_custom_stream_html(
    user: OptionalUser
) -> FileResponse:
    """
    Serve custom stream.html that passes token to WebSocket.

    This replaces the original go2rtc stream.html to add token support.
    """
    import os
    static_dir = os.path.join(os.path.dirname(__file__), '..', 'static')
    stream_html = os.path.join(static_dir, 'stream.html')

    if not os.path.exists(stream_html):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="stream.html not found"
        )

    return FileResponse(
        stream_html,
        media_type="text/html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.api_route("/go2rtc/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_go2rtc_http(
    path: str,
    request: Request,
    user: OptionalUser
) -> Response:
    """
    Proxy all HTTP requests to go2rtc with optional authentication.

    Static files (.js, .css, .html, .ico, .png, .jpg, .svg) are allowed without auth
    for iframe embedding. All other requests (API endpoints) require authentication.

    This allows frontend to access go2rtc stream.html and other endpoints
    through our authenticated backend.

    Examples:
    - /api/frigate/go2rtc/stream.html?src=camera_name (no auth needed)
    - /api/frigate/go2rtc/video-stream.js (no auth needed)
    - /api/frigate/go2rtc/api/streams?token=JWT (auth required)
    - /api/frigate/go2rtc/api/webrtc?src=camera_name&token=JWT (auth required)

    Auth: Supports both Bearer header and ?token= query parameter
    """
    # Static file extensions that don't require auth
    static_extensions = ('.js', '.css', '.html', '.ico', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.eot')
    is_static_file = path.lower().endswith(static_extensions)

    # Require auth for non-static files
    if not is_static_file and user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for API endpoints"
        )

    settings = get_settings()
    go2rtc_url = f"{settings.GO2RTC_URL}/{path}"

    # Get query parameters from original request
    query_params = dict(request.query_params)
    # Remove 'token' from query params as it's only for our auth
    query_params.pop('token', None)

    # Get request body if present
    body = await request.body()

    # Forward request to go2rtc
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=request.method,
                url=go2rtc_url,
                params=query_params,
                headers={
                    # Forward relevant headers (exclude auth headers)
                    k: v for k, v in request.headers.items()
                    if k.lower() not in ['host', 'authorization']
                },
                content=body,
                timeout=30.0,
                follow_redirects=True
            )

            # Return proxied response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers={
                    k: v for k, v in response.headers.items()
                    if k.lower() not in ['content-encoding', 'content-length', 'transfer-encoding']
                }
            )

        except httpx.RequestError as e:
            logger.error(f"go2rtc proxy error: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to go2rtc: {str(e)}"
            )


@router.websocket("/go2rtc/api/ws")
async def proxy_go2rtc_websocket(
    websocket: WebSocket,
    src: str,
    token: str | None = None
):
    """
    Proxy WebSocket connections to go2rtc with JWT authentication.

    This is the main endpoint for WebRTC streaming from cameras.

    Usage:
    ws://backend/api/frigate/go2rtc/api/ws?src=camera_name&token=JWT

    The token parameter is required for authentication.
    """
    import asyncio
    import websockets

    # Authenticate using token query parameter
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    # Verify JWT token
    payload = verify_jwt(token)
    if payload is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Accept the connection from client
    await websocket.accept()

    settings = get_settings()
    go2rtc_ws_url = f"{settings.GO2RTC_URL.replace('http://', 'ws://').replace('https://', 'wss://')}/api/ws?src={src}"

    logger.info(f"Proxying WebSocket to go2rtc: {go2rtc_ws_url}")

    # Connect to go2rtc WebSocket with optimized settings
    try:
        # Disable compression and set large max_size for video streams
        async with websockets.connect(
            go2rtc_ws_url,
            compression=None,  # Disable compression for lower latency
            max_size=10 * 1024 * 1024,  # 10MB max message size for video frames
            ping_interval=None,  # Disable ping/pong for lower overhead
        ) as upstream:
            # Create tasks for bidirectional proxying
            async def forward_to_go2rtc():
                """Forward messages from client to go2rtc"""
                try:
                    while True:
                        data = await websocket.receive()
                        if 'text' in data:
                            await upstream.send(data['text'])
                        elif 'bytes' in data:
                            await upstream.send(data['bytes'])
                except WebSocketDisconnect:
                    logger.debug("Client disconnected")
                except Exception as e:
                    logger.debug(f"Error forwarding to go2rtc: {e}")

            async def forward_from_go2rtc():
                """Forward messages from go2rtc to client"""
                try:
                    async for message in upstream:
                        if isinstance(message, str):
                            await websocket.send_text(message)
                        elif isinstance(message, bytes):
                            await websocket.send_bytes(message)
                except Exception as e:
                    logger.debug(f"Error forwarding from go2rtc: {e}")

            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_go2rtc(),
                forward_from_go2rtc(),
                return_exceptions=True
            )

    except Exception as e:
        logger.error(f"go2rtc WebSocket proxy error: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason=str(e))
        except:
            pass
