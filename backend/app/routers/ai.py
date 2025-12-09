"""
AI router.
Handles AI chat with SSE streaming, process management.
"""
import logging

from fastapi import APIRouter, HTTPException, status
from starlette.responses import StreamingResponse

from app.auth import CurrentUser
from app.services.ai_hub import get_ai_hub_service
from app.models.ai import (
    ChatRequest,
    ProcessListResponse,
    CancelResponse,
    AIHealthResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.get("/health", response_model=AIHealthResponse)
async def get_ai_health(user: CurrentUser) -> AIHealthResponse:
    """
    Get AI Hub (Claude Code API) health status.
    """
    service = await get_ai_hub_service()
    health = await service.get_health()

    if health is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service unavailable"
        )

    return health


@router.get("/processes", response_model=ProcessListResponse)
async def get_processes(user: CurrentUser) -> ProcessListResponse:
    """
    Get list of active AI processes.
    """
    service = await get_ai_hub_service()
    return await service.get_processes()


@router.post("/chat")
async def chat(
    request: ChatRequest,
    user: CurrentUser
) -> StreamingResponse:
    """
    Start AI chat session with SSE streaming.

    The response is a Server-Sent Events stream that proxies
    the raw SSE from Claude Code API without modification.

    Request body:
    - prompt: User message/instruction
    - cwd: Working directory for Claude (default: /tmp)
    - model: Optional model (sonnet, opus, haiku)
    - session_id: Optional session ID to resume
    - system_prompt: Optional replacement system prompt
    - append_system_prompt: Optional text to append to system prompt

    The stream includes:
    - System init with session_id (save this for resuming!)
    - Assistant messages with text and tool calls
    - User messages with tool results
    - Final result with usage stats and cost

    Important: The session_id from the first message should be saved
    to continue the conversation in future requests.
    """
    service = await get_ai_hub_service()

    async def generate():
        async for line in service.chat_stream(request):
            yield f"{line}\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.delete("/chat/{process_id}", response_model=CancelResponse)
async def cancel_chat(
    process_id: str,
    user: CurrentUser
) -> CancelResponse:
    """
    Cancel a running AI chat process.

    Note: This cancels the process but does NOT delete the session.
    You can still resume the session later using the session_id.
    """
    service = await get_ai_hub_service()
    result = await service.cancel_process(process_id)

    if result.status == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Process '{process_id}' not found"
        )

    if result.status == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel process"
        )

    return result
