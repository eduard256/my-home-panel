"""AI Hub (Claude Code API) models."""
from datetime import datetime
from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Request for AI chat endpoint."""
    prompt: str
    cwd: str = "/tmp"  # Working directory for Claude
    model: str | None = None  # sonnet, opus, haiku
    session_id: str | None = None  # For continuing sessions
    system_prompt: str | None = None  # Replace system prompt
    append_system_prompt: str | None = None  # Append to system prompt


class ProcessInfo(BaseModel):
    """Active AI process information."""
    process_id: str
    cwd: str
    model: str
    started_at: datetime
    session_id: str | None = None


class ProcessListResponse(BaseModel):
    """Response for process list endpoint."""
    processes: list[ProcessInfo]
    count: int


class CancelResponse(BaseModel):
    """Response for cancel process endpoint."""
    status: str
    process_id: str


class AIHealthResponse(BaseModel):
    """AI Hub health response."""
    status: str
    claude_path: str | None = None
    claude_version: str | None = None
