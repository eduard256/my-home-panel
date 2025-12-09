"""
Automation Monitor API client service.
Handles communication with automation-monitor for container management.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncGenerator

import httpx

from app.config import get_settings
from app.models.automation import (
    AutomationInfo,
    AutomationListResponse,
    AutomationActionResponse,
    AutomationStatsResponse,
    AutomationHealthResponse,
    ContainerInfo,
    MQTTInfo,
    MQTTStatus,
    HealthInfo
)

logger = logging.getLogger(__name__)


class AutomationClient:
    """Async client for Automation Monitor API."""

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
            logger.error(f"Automation API error: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Automation API request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Automation API unexpected error: {e}")
            return None

    async def get_health(self) -> dict | None:
        """Get API health status."""
        return await self._request("GET", "/api/health")

    async def get_automations(self) -> dict | None:
        """Get all automations."""
        return await self._request("GET", "/api/automations")

    async def get_automation(self, name: str) -> dict | None:
        """Get single automation by name."""
        return await self._request("GET", f"/api/automations/{name}")

    async def control_automation(self, name: str, action: str) -> dict | None:
        """Control automation (start/stop/restart)."""
        return await self._request("POST", f"/api/control/{name}/{action}")

    async def get_stats(self, container_name: str | None = None) -> dict | None:
        """Get container stats."""
        if container_name:
            return await self._request("GET", f"/api/stats/{container_name}")
        return await self._request("GET", "/api/stats")


class AutomationService:
    """High-level service for Automation Monitor operations."""

    def __init__(self):
        self._client: AutomationClient | None = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize Automation client."""
        if self._initialized:
            return

        settings = get_settings()

        self._client = AutomationClient(
            base_url=settings.AUTOMATION_API_URL,
            username=settings.AUTOMATION_API_USER,
            password=settings.AUTOMATION_API_PASSWORD
        )

        self._initialized = True
        logger.info(f"Initialized Automation service: {settings.AUTOMATION_API_URL}")

    async def close(self) -> None:
        """Close Automation client."""
        if self._client:
            await self._client.close()
            self._client = None
        self._initialized = False

    async def get_health(self) -> AutomationHealthResponse | None:
        """Get API health status."""
        if self._client is None:
            return None

        data = await self._client.get_health()
        if data is None:
            return None

        return AutomationHealthResponse(
            service=data.get("service", "automation-monitor"),
            status=data.get("status", "unknown"),
            uptime_seconds=data.get("uptime_seconds", 0),
            docker_connected=data.get("docker_connected", False),
            mqtt_connected=data.get("mqtt_connected", False),
            tracked_automations=data.get("tracked_automations", 0),
            timestamp=datetime.fromisoformat(data["timestamp"])
            if data.get("timestamp") else datetime.utcnow()
        )

    async def get_automations(self) -> AutomationListResponse:
        """Get all automations with their status."""
        if self._client is None:
            return AutomationListResponse(
                automations=[],
                total=0,
                running=0,
                stopped=0
            )

        data = await self._client.get_automations()
        if data is None:
            return AutomationListResponse(
                automations=[],
                total=0,
                running=0,
                stopped=0
            )

        automations: list[AutomationInfo] = []

        for auto in data.get("automations", []):
            # Parse container info
            container_data = auto.get("container", {})
            container = ContainerInfo(
                id=container_data.get("id", ""),
                status=container_data.get("status", "unknown"),
                image=container_data.get("image", ""),
                created=datetime.fromisoformat(container_data["created"])
                if container_data.get("created") else None,
                started=datetime.fromisoformat(container_data["started"])
                if container_data.get("started") else None,
                uptime_seconds=container_data.get("uptime_seconds")
            )

            # Parse MQTT info
            mqtt_data = auto.get("mqtt", {})
            mqtt_info = None
            if mqtt_data:
                mqtt_status_data = mqtt_data.get("status", {})
                mqtt_status = None
                if mqtt_status_data:
                    mqtt_status = MQTTStatus(
                        status=mqtt_status_data.get("status"),
                        uptime=mqtt_status_data.get("uptime"),
                        triggers_count=mqtt_status_data.get("triggers_count"),
                        errors_count=mqtt_status_data.get("errors_count"),
                        last_trigger=datetime.fromisoformat(mqtt_status_data["last_trigger"])
                        if mqtt_status_data.get("last_trigger") else None,
                        timestamp=datetime.fromisoformat(mqtt_status_data["timestamp"])
                        if mqtt_status_data.get("timestamp") else None
                    )

                mqtt_info = MQTTInfo(
                    status=mqtt_status,
                    ready=mqtt_data.get("ready"),
                    config=mqtt_data.get("config"),
                    last_seen=datetime.fromisoformat(mqtt_data["last_seen"])
                    if mqtt_data.get("last_seen") else None
                )

            # Parse health info
            health_data = auto.get("health", {})
            health = HealthInfo(
                overall=health_data.get("overall", "unhealthy"),
                docker_running=health_data.get("docker_running", False),
                mqtt_responding=health_data.get("mqtt_responding", False)
            )

            automations.append(AutomationInfo(
                container_name=auto.get("container_name", ""),
                automation_name=auto.get("automation_name", ""),
                container=container,
                mqtt=mqtt_info,
                health=health
            ))

        return AutomationListResponse(
            automations=automations,
            total=data.get("total", len(automations)),
            running=data.get("running", 0),
            stopped=data.get("stopped", 0)
        )

    async def get_automation(self, name: str) -> AutomationInfo | None:
        """Get single automation by name."""
        if self._client is None:
            return None

        data = await self._client.get_automation(name)
        if data is None:
            return None

        # Parse same way as in get_automations
        container_data = data.get("container", {})
        container = ContainerInfo(
            id=container_data.get("id", ""),
            status=container_data.get("status", "unknown"),
            image=container_data.get("image", ""),
            created=datetime.fromisoformat(container_data["created"])
            if container_data.get("created") else None,
            started=datetime.fromisoformat(container_data["started"])
            if container_data.get("started") else None,
            uptime_seconds=container_data.get("uptime_seconds")
        )

        mqtt_data = data.get("mqtt", {})
        mqtt_info = None
        if mqtt_data:
            mqtt_status_data = mqtt_data.get("status", {})
            mqtt_status = None
            if mqtt_status_data:
                mqtt_status = MQTTStatus(
                    status=mqtt_status_data.get("status"),
                    uptime=mqtt_status_data.get("uptime"),
                    triggers_count=mqtt_status_data.get("triggers_count"),
                    errors_count=mqtt_status_data.get("errors_count"),
                    last_trigger=datetime.fromisoformat(mqtt_status_data["last_trigger"])
                    if mqtt_status_data.get("last_trigger") else None,
                    timestamp=datetime.fromisoformat(mqtt_status_data["timestamp"])
                    if mqtt_status_data.get("timestamp") else None
                )

            mqtt_info = MQTTInfo(
                status=mqtt_status,
                ready=mqtt_data.get("ready"),
                config=mqtt_data.get("config"),
                last_seen=datetime.fromisoformat(mqtt_data["last_seen"])
                if mqtt_data.get("last_seen") else None
            )

        health_data = data.get("health", {})
        health = HealthInfo(
            overall=health_data.get("overall", "unhealthy"),
            docker_running=health_data.get("docker_running", False),
            mqtt_responding=health_data.get("mqtt_responding", False)
        )

        return AutomationInfo(
            container_name=data.get("container_name", ""),
            automation_name=data.get("automation_name", ""),
            container=container,
            mqtt=mqtt_info,
            health=health
        )

    async def control_automation(
        self,
        name: str,
        action: str
    ) -> AutomationActionResponse:
        """Control automation (start/stop/restart)."""
        if self._client is None:
            return AutomationActionResponse(
                success=False,
                action=action,
                container_name=name,
                message="Service not initialized"
            )

        data = await self._client.control_automation(name, action)
        if data is None:
            return AutomationActionResponse(
                success=False,
                action=action,
                container_name=name,
                message="Failed to execute action"
            )

        return AutomationActionResponse(
            success=data.get("success", False),
            action=data.get("action", action),
            container_name=data.get("container_name", name),
            message=data.get("message", ""),
            new_status=data.get("new_status")
        )

    async def get_stats(
        self,
        container_name: str | None = None
    ) -> AutomationStatsResponse | list[AutomationStatsResponse] | None:
        """Get container resource stats."""
        if self._client is None:
            return None

        data = await self._client.get_stats(container_name)
        if data is None:
            return None

        if container_name:
            # Single container stats
            return AutomationStatsResponse(
                container_name=data.get("container_name", container_name),
                timestamp=datetime.fromisoformat(data["timestamp"])
                if data.get("timestamp") else datetime.utcnow(),
                cpu=data.get("cpu", {}),
                memory=data.get("memory", {}),
                network=data.get("network", {}),
                block_io=data.get("block_io", {})
            )

        # All containers stats
        result = []
        for container in data.get("containers", []):
            result.append(AutomationStatsResponse(
                container_name=container.get("container_name", ""),
                timestamp=datetime.fromisoformat(container["timestamp"])
                if container.get("timestamp") else datetime.utcnow(),
                cpu=container.get("cpu", {}),
                memory=container.get("memory", {}),
                network=container.get("network", {}),
                block_io=container.get("block_io", {})
            ))

        return result

    async def stream_logs(
        self,
        container_name: str,
        lines: int = 100
    ) -> AsyncGenerator[str, None]:
        """
        Stream logs from container via SSE.
        """
        if self._client is None:
            return

        settings = get_settings()
        url = f"{settings.AUTOMATION_API_URL}/api/logs/{container_name}"
        params = {"lines": lines}

        try:
            async with httpx.AsyncClient(
                auth=self._client.auth,
                timeout=None
            ) as client:
                async with client.stream("GET", url, params=params) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            yield line[5:].strip()
                        elif line.startswith("event:"):
                            event_type = line[6:].strip()
                            if event_type == "ping":
                                yield json.dumps({"type": "ping"})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Log streaming error: {e}")


# Singleton instance
_automation_service: AutomationService | None = None


async def get_automation_service() -> AutomationService:
    """Get Automation service singleton."""
    global _automation_service
    if _automation_service is None:
        _automation_service = AutomationService()
        await _automation_service.initialize()
    return _automation_service


async def close_automation_service() -> None:
    """Close Automation service."""
    global _automation_service
    if _automation_service is not None:
        await _automation_service.close()
        _automation_service = None
