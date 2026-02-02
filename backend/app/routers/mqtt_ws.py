"""
MQTT WebSocket proxy router.
Authenticates clients via JWT and proxies bidirectionally
to the internal mqtt-ws-gateway service.
"""
import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
import websockets

from app.config import get_settings
from app.auth import authenticate_websocket

logger = logging.getLogger(__name__)

router = APIRouter(tags=["MQTT WebSocket"])


@router.websocket("/ws/mqtt")
async def mqtt_websocket(websocket: WebSocket):
    """
    WebSocket proxy for MQTT gateway.

    Authentication:
        - Authorization header: "Bearer <jwt>"
        - Or Sec-WebSocket-Protocol: "Bearer.<jwt>"

    Proxies all messages bidirectionally to the internal
    mqtt-ws-gateway (no auth, localhost only).
    """
    # Authenticate
    user = await authenticate_websocket(websocket)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept with subprotocol if client sent one (needed for Bearer.token auth)
    protocol = websocket.headers.get("sec-websocket-protocol")
    if protocol and protocol.startswith("Bearer."):
        await websocket.accept(subprotocol=protocol)
    else:
        await websocket.accept()
    logger.info("MQTT WS proxy: client connected")

    settings = get_settings()
    gateway_ws = None

    try:
        # Connect to upstream gateway
        gateway_ws = await websockets.connect(
            settings.MQTT_WS_URL,
            max_size=None,  # No limit — init cache can be very large
        )
        logger.info(f"MQTT WS proxy: connected to gateway {settings.MQTT_WS_URL}")

        async def client_to_gateway():
            """Forward messages from authenticated client to gateway."""
            try:
                while True:
                    data = await websocket.receive_text()
                    logger.debug(f"MQTT WS proxy: c2g: {data[:200]}")
                    await gateway_ws.send(data)
            except WebSocketDisconnect:
                logger.info("MQTT WS proxy: client disconnected (c2g)")
            except Exception as e:
                logger.error(f"MQTT WS proxy: client read error: {type(e).__name__}: {e}")

        async def gateway_to_client():
            """Forward messages from gateway to authenticated client."""
            try:
                async for message in gateway_ws:
                    logger.debug(f"MQTT WS proxy: g2c: {str(message)[:200]}")
                    await websocket.send_text(message if isinstance(message, str) else message.decode())
            except websockets.ConnectionClosed as e:
                logger.error(f"MQTT WS proxy: gateway closed (g2c): code={e.code} reason={e.reason}")
            except Exception as e:
                logger.error(f"MQTT WS proxy: gateway read error: {type(e).__name__}: {e}")

        async def ping_client():
            """Send periodic ping to keep client connection alive."""
            try:
                while True:
                    await asyncio.sleep(25)
                    await websocket.send_text('{"type":"ping"}')
            except Exception:
                pass

        # Run both directions + ping concurrently
        tasks = [
            asyncio.create_task(client_to_gateway()),
            asyncio.create_task(gateway_to_client()),
            asyncio.create_task(ping_client()),
        ]

        # Wait for either task to finish (means one side disconnected)
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

        # Cancel the remaining task
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except websockets.InvalidURI:
        logger.error(f"MQTT WS proxy: invalid gateway URL: {settings.MQTT_WS_URL}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    except (ConnectionRefusedError, OSError) as e:
        logger.error(f"MQTT WS proxy: cannot connect to gateway: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    except WebSocketDisconnect:
        logger.info("MQTT WS proxy: client disconnected")
    except Exception as e:
        logger.error(f"MQTT WS proxy: unexpected error: {e}")
    finally:
        if gateway_ws:
            await gateway_ws.close()
        logger.info("MQTT WS proxy: connection closed")
