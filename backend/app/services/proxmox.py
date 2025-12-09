"""
Proxmox VE API client service.
Handles communication with Proxmox servers via REST API.
"""
import asyncio
import logging
from typing import Any

import httpx

from app.config import get_settings
from app.models.proxmox import (
    ServerStatus,
    VMInfo,
    VMListResponse,
    VMActionResponse
)

logger = logging.getLogger(__name__)


class ProxmoxClient:
    """Async client for Proxmox VE API."""

    def __init__(
        self,
        server_id: str,
        api_url: str,
        api_user: str,
        api_token: str,
        node: str
    ):
        self.server_id = server_id
        self.api_url = api_url.rstrip("/")
        self.api_user = api_user
        self.api_token = api_token
        self.node = node

        # Authorization header: PVEAPIToken=user!tokenid=secret
        self.auth_header = f"PVEAPIToken={api_user}={api_token}"

        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.api_url,
                headers={"Authorization": self.auth_header},
                verify=False,  # Proxmox uses self-signed certs
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
    ) -> dict | None:
        """Make API request with error handling."""
        client = await self._get_client()
        try:
            response = await client.request(method, endpoint, **kwargs)
            response.raise_for_status()
            data = response.json()
            return data.get("data")
        except httpx.HTTPStatusError as e:
            logger.error(f"Proxmox API error: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Proxmox request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Proxmox unexpected error: {e}")
            return None

    async def get_node_status(self) -> dict | None:
        """Get node status (CPU, memory, etc.)."""
        return await self._request("GET", f"/nodes/{self.node}/status")

    async def get_node_rrddata(self, timeframe: str = "hour") -> list | None:
        """Get node RRD data for graphs."""
        return await self._request(
            "GET",
            f"/nodes/{self.node}/rrddata",
            params={"timeframe": timeframe}
        )

    async def get_vms(self) -> list | None:
        """Get list of VMs (QEMU)."""
        return await self._request("GET", f"/nodes/{self.node}/qemu")

    async def get_containers(self) -> list | None:
        """Get list of containers (LXC)."""
        return await self._request("GET", f"/nodes/{self.node}/lxc")

    async def get_vm_status(self, vmid: int) -> dict | None:
        """Get VM status."""
        return await self._request(
            "GET",
            f"/nodes/{self.node}/qemu/{vmid}/status/current"
        )

    async def get_container_status(self, vmid: int) -> dict | None:
        """Get container status."""
        return await self._request(
            "GET",
            f"/nodes/{self.node}/lxc/{vmid}/status/current"
        )

    async def vm_action(
        self,
        vmid: int,
        action: str,
        vm_type: str = "qemu"
    ) -> dict | None:
        """Execute VM/container action (start, stop, shutdown, restart)."""
        endpoint = f"/nodes/{self.node}/{vm_type}/{vmid}/status/{action}"
        return await self._request("POST", endpoint)

    async def get_storage_status(self, storage: str = "local") -> dict | None:
        """Get storage status."""
        return await self._request(
            "GET",
            f"/nodes/{self.node}/storage/{storage}/status"
        )


class ProxmoxService:
    """
    High-level service for managing multiple Proxmox servers.
    Provides unified interface for all Proxmox operations.
    """

    def __init__(self):
        self._clients: dict[str, ProxmoxClient] = {}
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize clients for all configured servers."""
        if self._initialized:
            return

        settings = get_settings()

        for server_id, config in settings.proxmox_servers.items():
            self._clients[server_id] = ProxmoxClient(
                server_id=server_id,
                api_url=config["api_url"],
                api_user=config["api_user"],
                api_token=config["api_token"],
                node=config["node"]
            )

        self._initialized = True
        logger.info(f"Initialized Proxmox clients: {list(self._clients.keys())}")

    async def close(self) -> None:
        """Close all clients."""
        for client in self._clients.values():
            await client.close()
        self._clients.clear()
        self._initialized = False

    def get_client(self, server_id: str) -> ProxmoxClient | None:
        """Get client for specific server."""
        return self._clients.get(server_id)

    async def get_all_servers_status(self) -> list[ServerStatus]:
        """Get status of all servers in parallel."""
        settings = get_settings()
        servers_config = settings.proxmox_servers

        async def fetch_server_status(server_id: str) -> ServerStatus:
            client = self._clients.get(server_id)
            config = servers_config.get(server_id, {})

            base_status = ServerStatus(
                id=server_id,
                name=config.get("name", server_id),
                ip=config.get("ip", ""),
                node=config.get("node", ""),
                online=False
            )

            if client is None:
                return base_status

            try:
                # Get node status
                status_data = await client.get_node_status()
                if status_data is None:
                    return base_status

                # Get VM and container counts
                vms = await client.get_vms() or []
                cts = await client.get_containers() or []

                vms_running = sum(1 for vm in vms if vm.get("status") == "running")
                cts_running = sum(1 for ct in cts if ct.get("status") == "running")

                # Calculate memory percent
                memory_used = status_data.get("memory", {}).get("used", 0)
                memory_total = status_data.get("memory", {}).get("total", 1)
                memory_percent = (memory_used / memory_total * 100) if memory_total > 0 else 0

                # Calculate disk percent (root filesystem)
                disk_used = status_data.get("rootfs", {}).get("used", 0)
                disk_total = status_data.get("rootfs", {}).get("total", 1)
                disk_percent = (disk_used / disk_total * 100) if disk_total > 0 else 0

                return ServerStatus(
                    id=server_id,
                    name=config.get("name", server_id),
                    ip=config.get("ip", ""),
                    node=config.get("node", ""),
                    online=True,
                    uptime=status_data.get("uptime"),
                    cpu=status_data.get("cpu", 0) * 100,  # Convert 0-1 to 0-100
                    memory_used=memory_used,
                    memory_total=memory_total,
                    memory_percent=round(memory_percent, 2),
                    disk_used=disk_used,
                    disk_total=disk_total,
                    disk_percent=round(disk_percent, 2),
                    network_in=status_data.get("netin"),
                    network_out=status_data.get("netout"),
                    load_average=status_data.get("loadavg"),
                    vms_running=vms_running,
                    vms_total=len(vms),
                    cts_running=cts_running,
                    cts_total=len(cts)
                )

            except Exception as e:
                logger.error(f"Error fetching status for {server_id}: {e}")
                return base_status

        # Fetch all servers in parallel
        tasks = [fetch_server_status(sid) for sid in self._clients.keys()]
        results = await asyncio.gather(*tasks)

        return list(results)

    async def get_server_status(self, server_id: str) -> ServerStatus | None:
        """Get status of a single server."""
        statuses = await self.get_all_servers_status()
        for status in statuses:
            if status.id == server_id:
                return status
        return None

    async def get_all_vms(self, server_id: str) -> VMListResponse | None:
        """Get all VMs and containers for a server."""
        client = self._clients.get(server_id)
        if client is None:
            return None

        try:
            # Fetch VMs and containers in parallel
            vms_task = client.get_vms()
            cts_task = client.get_containers()
            vms_raw, cts_raw = await asyncio.gather(vms_task, cts_task)

            vms_raw = vms_raw or []
            cts_raw = cts_raw or []

            all_vms: list[VMInfo] = []

            # Process VMs
            for vm in vms_raw:
                all_vms.append(VMInfo(
                    vmid=vm.get("vmid"),
                    name=vm.get("name", f"vm-{vm.get('vmid')}"),
                    type="qemu",
                    status=vm.get("status", "unknown"),
                    cpu=vm.get("cpu"),
                    cpu_percent=vm.get("cpu", 0) * 100 if vm.get("cpu") else None,
                    cpus=vm.get("cpus"),
                    memory_used=vm.get("mem"),
                    memory_total=vm.get("maxmem"),
                    memory_percent=(
                        vm.get("mem", 0) / vm.get("maxmem", 1) * 100
                        if vm.get("maxmem") else None
                    ),
                    disk_used=vm.get("disk"),
                    disk_total=vm.get("maxdisk"),
                    disk_read=vm.get("diskread"),
                    disk_write=vm.get("diskwrite"),
                    network_in=vm.get("netin"),
                    network_out=vm.get("netout"),
                    uptime=vm.get("uptime"),
                    tags=vm.get("tags", "").split(";") if vm.get("tags") else [],
                    template=vm.get("template", 0) == 1
                ))

            # Process containers
            for ct in cts_raw:
                all_vms.append(VMInfo(
                    vmid=ct.get("vmid"),
                    name=ct.get("name", f"ct-{ct.get('vmid')}"),
                    type="lxc",
                    status=ct.get("status", "unknown"),
                    cpu=ct.get("cpu"),
                    cpu_percent=ct.get("cpu", 0) * 100 if ct.get("cpu") else None,
                    cpus=ct.get("cpus"),
                    memory_used=ct.get("mem"),
                    memory_total=ct.get("maxmem"),
                    memory_percent=(
                        ct.get("mem", 0) / ct.get("maxmem", 1) * 100
                        if ct.get("maxmem") else None
                    ),
                    disk_used=ct.get("disk"),
                    disk_total=ct.get("maxdisk"),
                    disk_read=ct.get("diskread"),
                    disk_write=ct.get("diskwrite"),
                    network_in=ct.get("netin"),
                    network_out=ct.get("netout"),
                    uptime=ct.get("uptime"),
                    tags=ct.get("tags", "").split(";") if ct.get("tags") else [],
                    template=ct.get("template", 0) == 1
                ))

            # Sort by vmid
            all_vms.sort(key=lambda x: x.vmid)

            running = sum(1 for vm in all_vms if vm.status == "running")
            stopped = len(all_vms) - running

            return VMListResponse(
                server_id=server_id,
                vms=all_vms,
                total=len(all_vms),
                running=running,
                stopped=stopped
            )

        except Exception as e:
            logger.error(f"Error fetching VMs for {server_id}: {e}")
            return None

    async def get_vm_details(
        self,
        server_id: str,
        vmid: int,
        vm_type: str = "qemu"
    ) -> VMInfo | None:
        """Get detailed info for a single VM/container."""
        client = self._clients.get(server_id)
        if client is None:
            return None

        try:
            if vm_type == "qemu":
                data = await client.get_vm_status(vmid)
            else:
                data = await client.get_container_status(vmid)

            if data is None:
                return None

            return VMInfo(
                vmid=vmid,
                name=data.get("name", f"{vm_type}-{vmid}"),
                type=vm_type,
                status=data.get("status", "unknown"),
                cpu=data.get("cpu"),
                cpu_percent=data.get("cpu", 0) * 100 if data.get("cpu") else None,
                cpus=data.get("cpus"),
                memory_used=data.get("mem"),
                memory_total=data.get("maxmem"),
                memory_percent=(
                    data.get("mem", 0) / data.get("maxmem", 1) * 100
                    if data.get("maxmem") else None
                ),
                disk_used=data.get("disk"),
                disk_total=data.get("maxdisk"),
                disk_read=data.get("diskread"),
                disk_write=data.get("diskwrite"),
                network_in=data.get("netin"),
                network_out=data.get("netout"),
                uptime=data.get("uptime"),
                tags=data.get("tags", "").split(";") if data.get("tags") else []
            )

        except Exception as e:
            logger.error(f"Error fetching VM {vmid} from {server_id}: {e}")
            return None

    async def execute_vm_action(
        self,
        server_id: str,
        vmid: int,
        action: str,
        vm_type: str = "qemu"
    ) -> VMActionResponse:
        """Execute action on VM/container."""
        client = self._clients.get(server_id)

        if client is None:
            return VMActionResponse(
                success=False,
                server_id=server_id,
                vmid=vmid,
                action=action,
                message=f"Server {server_id} not found"
            )

        try:
            result = await client.vm_action(vmid, action, vm_type)

            if result is None:
                return VMActionResponse(
                    success=False,
                    server_id=server_id,
                    vmid=vmid,
                    action=action,
                    message="Action failed - no response from Proxmox"
                )

            # Proxmox returns UPID for async tasks
            upid = result if isinstance(result, str) else None

            return VMActionResponse(
                success=True,
                server_id=server_id,
                vmid=vmid,
                action=action,
                message=f"Action {action} initiated successfully",
                upid=upid
            )

        except Exception as e:
            logger.error(f"Error executing {action} on {vmid}: {e}")
            return VMActionResponse(
                success=False,
                server_id=server_id,
                vmid=vmid,
                action=action,
                message=str(e)
            )


# Singleton instance
_proxmox_service: ProxmoxService | None = None


async def get_proxmox_service() -> ProxmoxService:
    """Get Proxmox service singleton."""
    global _proxmox_service
    if _proxmox_service is None:
        _proxmox_service = ProxmoxService()
        await _proxmox_service.initialize()
    return _proxmox_service


async def close_proxmox_service() -> None:
    """Close Proxmox service."""
    global _proxmox_service
    if _proxmox_service is not None:
        await _proxmox_service.close()
        _proxmox_service = None
