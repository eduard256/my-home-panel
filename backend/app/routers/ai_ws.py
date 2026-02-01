"""
AI WebSocket router.
Handles AI chat with WebSocket streaming, buffering for reconnect,
and content truncation for mobile clients.
"""
import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.config import get_settings
from app.auth import authenticate_websocket
from app.services.ai_hub import get_ai_hub_service
from app.models.ai import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI WebSocket"])

# =============================================================================
# Configuration
# =============================================================================

MAX_CONTENT_LINES = 100  # Max lines for truncated content
BUFFER_TTL_MINUTES = 30  # How long to keep event buffer
CLEANUP_INTERVAL_SECONDS = 60  # How often to clean expired buffers

# Tools to truncate content
TRUNCATE_CONFIG = {
    "Read": ["file.content", "content"],
    "Write": ["content", "result.content"],
    "Edit": ["result.originalFile", "input.old_string", "input.new_string"],
}


# =============================================================================
# Event Buffer for Reconnection
# =============================================================================

@dataclass
class SessionBuffer:
    """Buffer for storing events during a chat session."""
    session_id: str
    process_id: str | None = None
    events: list[dict] = field(default_factory=list)
    last_event_id: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    is_complete: bool = False

    def add_event(self, event_type: str, data: dict) -> dict:
        """Add event to buffer and return with event_id."""
        self.last_event_id += 1
        self.last_activity = datetime.utcnow()

        event = {
            "event_id": self.last_event_id,
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.events.append(event)
        return event

    def get_events_after(self, last_event_id: int) -> list[dict]:
        """Get all events after given event_id."""
        return [e for e in self.events if e["event_id"] > last_event_id]

    def is_expired(self) -> bool:
        """Check if buffer has expired."""
        return datetime.utcnow() - self.last_activity > timedelta(minutes=BUFFER_TTL_MINUTES)


class EventBufferManager:
    """Manager for session event buffers."""

    def __init__(self):
        self._buffers: dict[str, SessionBuffer] = {}
        self._lock = asyncio.Lock()
        self._cleanup_task: asyncio.Task | None = None

    async def start_cleanup_task(self):
        """Start background cleanup task."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop_cleanup_task(self):
        """Stop background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None

    async def _cleanup_loop(self):
        """Periodically clean expired buffers."""
        while True:
            try:
                await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
                await self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Buffer cleanup error: {e}")

    async def _cleanup_expired(self):
        """Remove expired buffers."""
        async with self._lock:
            expired = [k for k, v in self._buffers.items() if v.is_expired()]
            for key in expired:
                del self._buffers[key]
                logger.debug(f"Cleaned expired buffer: {key}")

    async def create_buffer(self, session_id: str) -> SessionBuffer:
        """Create new buffer for session."""
        async with self._lock:
            buffer = SessionBuffer(session_id=session_id)
            self._buffers[session_id] = buffer
            return buffer

    async def get_buffer(self, session_id: str) -> SessionBuffer | None:
        """Get existing buffer by session_id."""
        async with self._lock:
            buffer = self._buffers.get(session_id)
            if buffer and not buffer.is_expired():
                return buffer
            return None

    async def get_or_create_buffer(self, session_id: str) -> SessionBuffer:
        """Get existing or create new buffer."""
        buffer = await self.get_buffer(session_id)
        if buffer:
            return buffer
        return await self.create_buffer(session_id)

    async def update_process_id(self, session_id: str, process_id: str):
        """Update process_id for session."""
        async with self._lock:
            if session_id in self._buffers:
                self._buffers[session_id].process_id = process_id


# Global buffer manager
buffer_manager = EventBufferManager()


# =============================================================================
# Content Truncation
# =============================================================================

def truncate_content(content: str, max_lines: int = MAX_CONTENT_LINES) -> dict:
    """
    Truncate content to max_lines and return with metadata.
    """
    if not content:
        return {"content": "", "truncated": False, "total_lines": 0, "shown_lines": 0}

    lines = content.split('\n')
    total_lines = len(lines)

    if total_lines <= max_lines:
        return {
            "content": content,
            "truncated": False,
            "total_lines": total_lines,
            "shown_lines": total_lines
        }

    truncated_lines = lines[:max_lines]
    return {
        "content": '\n'.join(truncated_lines),
        "truncated": True,
        "total_lines": total_lines,
        "shown_lines": max_lines
    }


def get_nested_value(obj: dict, path: str) -> Any:
    """Get value from nested dict using dot notation."""
    keys = path.split('.')
    value = obj
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return None
    return value


def set_nested_value(obj: dict, path: str, value: Any) -> None:
    """Set value in nested dict using dot notation."""
    keys = path.split('.')
    current = obj
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value


def truncate_tool_content(event_data: dict) -> dict:
    """
    Truncate content in tool results for Read/Write/Edit tools.
    """
    # Deep copy to avoid modifying original
    data = json.loads(json.dumps(event_data))

    # Get tool name from various locations
    tool_name = None

    # Check in tool_use_result
    if "tool_use_result" in data:
        # Try to find tool name from parent context or result structure
        result = data["tool_use_result"]

        # For Read tool
        if "file" in result and "content" in result.get("file", {}):
            tool_name = "Read"
        # For Write tool
        elif "type" in result and result.get("type") in ("create", "overwrite"):
            tool_name = "Write"
        # For Edit tool
        elif "originalFile" in result or "structuredPatch" in result:
            tool_name = "Edit"

    # Check in message content for tool_use
    if "message" in data and "content" in data["message"]:
        for content_item in data["message"]["content"]:
            if content_item.get("type") == "tool_use":
                name = content_item.get("name")
                if name in TRUNCATE_CONFIG:
                    tool_name = name
                    # Truncate input content
                    if "input" in content_item:
                        for path in TRUNCATE_CONFIG.get(name, []):
                            if path.startswith("input."):
                                field = path.replace("input.", "")
                                if field in content_item["input"]:
                                    original = content_item["input"][field]
                                    if isinstance(original, str):
                                        truncated = truncate_content(original)
                                        content_item["input"][field] = truncated["content"]
                                        content_item["input"][f"_{field}_truncated"] = truncated["truncated"]
                                        content_item["input"][f"_{field}_total_lines"] = truncated["total_lines"]

    # Truncate tool_use_result content
    if tool_name and tool_name in TRUNCATE_CONFIG and "tool_use_result" in data:
        result = data["tool_use_result"]

        for path in TRUNCATE_CONFIG[tool_name]:
            if path.startswith("result."):
                path = path.replace("result.", "")

            value = get_nested_value(result, path)
            if isinstance(value, str):
                truncated = truncate_content(value)
                set_nested_value(result, path, truncated["content"])
                # Add metadata
                set_nested_value(result, f"_{path.replace('.', '_')}_truncated", truncated["truncated"])
                set_nested_value(result, f"_{path.replace('.', '_')}_total_lines", truncated["total_lines"])
                set_nested_value(result, f"_{path.replace('.', '_')}_shown_lines", truncated["shown_lines"])

    return data


# =============================================================================
# SSE to WebSocket Event Conversion
# =============================================================================

def parse_sse_line(line: str) -> dict | None:
    """Parse SSE line into event dict."""
    if not line or line.startswith(':'):
        return None

    if line.startswith('data: '):
        data = line[6:]
        if data == '[DONE]':
            return {"type": "done", "data": {}}

        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return {"type": "raw", "data": {"content": data}}

    if line.startswith('event: '):
        event_type = line[7:]
        return {"type": event_type, "data": {}}

    return None


def convert_sse_to_ws_event(sse_data: dict, buffer: SessionBuffer) -> dict | None:
    """
    Convert SSE event from AI Hub to WebSocket event.
    Applies content truncation and adds event_id.
    """
    event_type = sse_data.get("type", "unknown")

    # Truncate content for tool results
    if event_type == "user":
        sse_data = truncate_tool_content(sse_data)
    elif event_type == "assistant":
        sse_data = truncate_tool_content(sse_data)

    # Extract session_id if present
    if "session_id" in sse_data and not buffer.session_id:
        buffer.session_id = sse_data["session_id"]

    # Add to buffer and return
    return buffer.add_event(event_type, sse_data)


# =============================================================================
# WebSocket Endpoint
# =============================================================================

@router.websocket("/ws/ai")
async def ai_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for AI chat.

    Authentication:
        - Authorization header: "Bearer <jwt>"
        - Or Sec-WebSocket-Protocol: "Bearer.<jwt>"

    Client -> Server messages:
        - {"type": "chat", "prompt": "...", "cwd": "...", "model": "sonnet", "session_id": null}
        - {"type": "reconnect", "session_id": "...", "last_event_id": 42}

    Server -> Client messages:
        - {"event_id": 1, "type": "init", "data": {"session_id": "...", "process_id": "..."}}
        - {"event_id": 2, "type": "system", "data": {...}}
        - {"event_id": 3, "type": "assistant", "data": {...}}
        - {"event_id": 4, "type": "user", "data": {...}}  # with truncated content
        - {"event_id": 5, "type": "result", "data": {...}}
        - {"event_id": 6, "type": "error", "data": {"message": "..."}}

    Cancel via REST:
        DELETE /api/ai/chat/{process_id}
    """
    # Authenticate
    user = await authenticate_websocket(websocket)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept connection
    await websocket.accept()
    logger.info("AI WebSocket connection accepted")

    # Start buffer cleanup task if not running
    await buffer_manager.start_cleanup_task()

    current_buffer: SessionBuffer | None = None
    stream_task: asyncio.Task | None = None

    try:
        while True:
            # Receive message from client
            try:
                message = await websocket.receive_json()
            except Exception as e:
                logger.error(f"Failed to receive message: {e}")
                break

            msg_type = message.get("type")

            if msg_type == "chat":
                # Cancel existing stream if any
                if stream_task and not stream_task.done():
                    stream_task.cancel()
                    try:
                        await stream_task
                    except asyncio.CancelledError:
                        pass

                # Start new chat
                prompt = message.get("prompt", "")
                cwd = message.get("cwd", "/tmp")
                model = message.get("model")
                session_id = message.get("session_id")
                system_prompt = message.get("system_prompt")
                append_system_prompt = message.get("append_system_prompt")

                if not prompt:
                    await websocket.send_json({
                        "event_id": 0,
                        "type": "error",
                        "data": {"message": "Prompt is required"}
                    })
                    continue

                # Create or get buffer
                buffer_key = session_id or f"new_{datetime.utcnow().timestamp()}"
                current_buffer = await buffer_manager.get_or_create_buffer(buffer_key)

                # Start streaming task
                stream_task = asyncio.create_task(
                    stream_chat(
                        websocket=websocket,
                        buffer=current_buffer,
                        prompt=prompt,
                        cwd=cwd,
                        model=model,
                        session_id=session_id,
                        system_prompt=system_prompt,
                        append_system_prompt=append_system_prompt
                    )
                )

            elif msg_type == "reconnect":
                # Reconnect to existing session
                session_id = message.get("session_id")
                last_event_id = message.get("last_event_id", 0)

                if not session_id:
                    await websocket.send_json({
                        "event_id": 0,
                        "type": "error",
                        "data": {"message": "session_id is required for reconnect"}
                    })
                    continue

                buffer = await buffer_manager.get_buffer(session_id)
                if not buffer:
                    await websocket.send_json({
                        "event_id": 0,
                        "type": "error",
                        "data": {"message": "Session not found or expired"}
                    })
                    continue

                current_buffer = buffer

                # Send missed events
                missed_events = buffer.get_events_after(last_event_id)
                logger.info(f"Reconnect: sending {len(missed_events)} missed events")

                for event in missed_events:
                    await websocket.send_json(event)

                # Send reconnect confirmation
                await websocket.send_json({
                    "event_id": buffer.last_event_id + 1,
                    "type": "reconnected",
                    "data": {
                        "session_id": session_id,
                        "process_id": buffer.process_id,
                        "events_sent": len(missed_events),
                        "is_complete": buffer.is_complete
                    }
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                await websocket.send_json({
                    "event_id": 0,
                    "type": "error",
                    "data": {"message": f"Unknown message type: {msg_type}"}
                })

    except WebSocketDisconnect:
        logger.info("AI WebSocket disconnected")
    except Exception as e:
        logger.error(f"AI WebSocket error: {e}")
    finally:
        # Cancel stream task if running
        if stream_task and not stream_task.done():
            stream_task.cancel()
            try:
                await stream_task
            except asyncio.CancelledError:
                pass


async def stream_chat(
    websocket: WebSocket,
    buffer: SessionBuffer,
    prompt: str,
    cwd: str,
    model: str | None,
    session_id: str | None,
    system_prompt: str | None,
    append_system_prompt: str | None
):
    """
    Stream chat response from AI Hub to WebSocket.
    """
    service = await get_ai_hub_service()

    # Create chat request
    request = ChatRequest(
        prompt=prompt,
        cwd=cwd,
        model=model,
        session_id=session_id,
        system_prompt=system_prompt,
        append_system_prompt=append_system_prompt
    )

    process_id = None
    actual_session_id = session_id

    try:
        # Send init event
        init_event = buffer.add_event("init", {
            "status": "starting",
            "session_id": session_id
        })
        await websocket.send_json(init_event)

        # Stream from AI Hub
        async for line in service.chat_stream(request):
            if not line:
                continue

            # Parse SSE line
            parsed = parse_sse_line(line)
            if not parsed:
                continue

            # Extract process_id and session_id from first system event
            if parsed.get("type") == "system" and parsed.get("subtype") == "init":
                actual_session_id = parsed.get("session_id", actual_session_id)
                buffer.session_id = actual_session_id

                # Update buffer key if session_id changed
                if actual_session_id and actual_session_id != session_id:
                    await buffer_manager.create_buffer(actual_session_id)

            # Handle done event to extract process_id
            if parsed.get("type") == "done":
                process_id = parsed.get("data", {}).get("process_id") or parsed.get("process_id")
                if process_id:
                    buffer.process_id = process_id
                    await buffer_manager.update_process_id(buffer.session_id, process_id)

            # Convert and send event
            ws_event = convert_sse_to_ws_event(parsed, buffer)
            if ws_event:
                try:
                    await websocket.send_json(ws_event)
                except Exception as e:
                    logger.warning(f"Failed to send event: {e}")
                    # Continue buffering even if send fails

        # Mark buffer as complete
        buffer.is_complete = True

        # Send complete event
        complete_event = buffer.add_event("complete", {
            "session_id": buffer.session_id,
            "process_id": buffer.process_id
        })
        await websocket.send_json(complete_event)

    except asyncio.CancelledError:
        logger.info("Chat stream cancelled")
        # Send cancelled event
        try:
            cancelled_event = buffer.add_event("cancelled", {
                "session_id": buffer.session_id,
                "process_id": buffer.process_id
            })
            await websocket.send_json(cancelled_event)
        except Exception:
            pass
        raise

    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        # Send error event
        try:
            error_event = buffer.add_event("error", {
                "message": str(e),
                "session_id": buffer.session_id
            })
            await websocket.send_json(error_event)
        except Exception:
            pass
