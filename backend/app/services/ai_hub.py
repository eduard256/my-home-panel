"""
AI Hub (Claude Code API) client service.
Provides SSE proxy for AI chat functionality.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, AsyncGenerator

import httpx

from app.config import get_settings
from app.models.ai import (
    ChatRequest,
    ProcessInfo,
    ProcessListResponse,
    CancelResponse,
    AIHealthResponse
)

logger = logging.getLogger(__name__)


class AIHubClient:
    """Async client for AI Hub (Claude Code API Gateway)."""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.auth = (username, password)
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                auth=self.auth,
                timeout=30.0
            )
        return self._client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def get_health(self) -> AIHealthResponse | None:
        """Get AI Hub health status."""
        client = await self._get_client()
        try:
            response = await client.get("/health")
            response.raise_for_status()
            data = response.json()
            return AIHealthResponse(
                status=data.get("status", "unknown"),
                claude_path=data.get("claude_path"),
                claude_version=data.get("claude_version")
            )
        except Exception as e:
            logger.error(f"AI Hub health check failed: {e}")
            return None

    async def get_processes(self) -> ProcessListResponse:
        """Get list of active processes."""
        client = await self._get_client()
        try:
            response = await client.get("/processes")
            response.raise_for_status()
            data = response.json()

            processes = []
            for proc in data.get("processes", []):
                processes.append(ProcessInfo(
                    process_id=proc.get("process_id", ""),
                    cwd=proc.get("cwd", ""),
                    model=proc.get("model", ""),
                    started_at=datetime.fromisoformat(proc["started_at"])
                    if proc.get("started_at") else datetime.utcnow(),
                    session_id=proc.get("session_id")
                ))

            return ProcessListResponse(
                processes=processes,
                count=data.get("count", len(processes))
            )
        except Exception as e:
            logger.error(f"AI Hub get processes failed: {e}")
            return ProcessListResponse(processes=[], count=0)

    async def cancel_process(self, process_id: str) -> CancelResponse:
        """Cancel a running process."""
        client = await self._get_client()
        try:
            response = await client.delete(f"/chat/{process_id}")
            response.raise_for_status()
            data = response.json()
            return CancelResponse(
                status=data.get("status", "cancelled"),
                process_id=data.get("process_id", process_id)
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return CancelResponse(
                    status="not_found",
                    process_id=process_id
                )
            logger.error(f"AI Hub cancel process failed: {e}")
            return CancelResponse(
                status="error",
                process_id=process_id
            )
        except Exception as e:
            logger.error(f"AI Hub cancel process failed: {e}")
            return CancelResponse(
                status="error",
                process_id=process_id
            )

    async def chat_stream(
        self,
        prompt: str,
        cwd: str,
        model: str | None = None,
        session_id: str | None = None,
        system_prompt: str | None = None,
        append_system_prompt: str | None = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response via SSE.
        Yields raw SSE lines from the AI Hub API.
        """
        # Build request body
        body: dict[str, Any] = {
            "prompt": prompt,
            "cwd": cwd
        }

        if model:
            body["model"] = model
        if session_id:
            body["session_id"] = session_id
        if system_prompt:
            body["system_prompt"] = system_prompt
        if append_system_prompt:
            body["append_system_prompt"] = append_system_prompt

        try:
            async with httpx.AsyncClient(
                auth=self.auth,
                timeout=None  # No timeout for streaming
            ) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat",
                    json=body
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if line:
                            yield line

        except asyncio.CancelledError:
            logger.info("AI chat stream cancelled")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"AI Hub chat stream HTTP error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}"
        except Exception as e:
            logger.error(f"AI Hub chat stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}"


class AIHubService:
    """High-level service for AI Hub operations."""

    def __init__(self):
        self._client: AIHubClient | None = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize AI Hub client."""
        if self._initialized:
            return

        settings = get_settings()

        self._client = AIHubClient(
            base_url=settings.AI_HUB_URL,
            username=settings.AI_HUB_USER,
            password=settings.AI_HUB_PASSWORD
        )

        self._initialized = True
        logger.info(f"Initialized AI Hub service: {settings.AI_HUB_URL}")

    async def close(self) -> None:
        """Close AI Hub client."""
        if self._client:
            await self._client.close()
            self._client = None
        self._initialized = False

    async def get_health(self) -> AIHealthResponse | None:
        """Get AI Hub health status."""
        if self._client is None:
            return None
        return await self._client.get_health()

    async def get_processes(self) -> ProcessListResponse:
        """Get list of active AI processes."""
        if self._client is None:
            return ProcessListResponse(processes=[], count=0)
        return await self._client.get_processes()

    async def cancel_process(self, process_id: str) -> CancelResponse:
        """Cancel a running AI process."""
        if self._client is None:
            return CancelResponse(status="error", process_id=process_id)
        return await self._client.cancel_process(process_id)

    async def chat_stream(
        self,
        request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response via SSE.
        Proxies the raw SSE stream from AI Hub without modification.
        """
        if self._client is None:
            yield f"data: {json.dumps({'error': 'AI service not initialized'})}"
            return

        async for line in self._client.chat_stream(
            prompt=request.prompt,
            cwd=request.cwd,
            model=request.model,
            session_id=request.session_id,
            system_prompt=request.system_prompt,
            append_system_prompt=request.append_system_prompt
        ):
            yield line


# Singleton instance
_ai_hub_service: AIHubService | None = None


async def get_ai_hub_service() -> AIHubService:
    """Get AI Hub service singleton."""
    global _ai_hub_service
    if _ai_hub_service is None:
        _ai_hub_service = AIHubService()
        await _ai_hub_service.initialize()
    return _ai_hub_service


async def close_ai_hub_service() -> None:
    """Close AI Hub service."""
    global _ai_hub_service
    if _ai_hub_service is not None:
        await _ai_hub_service.close()
        _ai_hub_service = None
