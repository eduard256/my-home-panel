"""
Proxmox router.
Handles server status, VM management, and control operations.
"""
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, status, Query

from app.auth import CurrentUser
from app.services.proxmox import get_proxmox_service
from app.models.proxmox import (
    ServerListResponse,
    ServerStatus,
    VMListResponse,
    VMInfo,
    VMActionResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proxmox", tags=["Proxmox"])


@router.get("/servers", response_model=ServerListResponse)
async def get_servers(user: CurrentUser) -> ServerListResponse:
    """
    Get list of all Proxmox servers with their current status.
    Returns CPU, memory, disk usage and VM/container counts.
    """
    service = await get_proxmox_service()
    servers = await service.get_all_servers_status()

    return ServerListResponse(
        servers=servers,
        total=len(servers)
    )


@router.get("/servers/{server_id}", response_model=ServerStatus)
async def get_server_status(
    server_id: str,
    user: CurrentUser
) -> ServerStatus:
    """
    Get detailed status for a specific server.
    """
    service = await get_proxmox_service()
    status = await service.get_server_status(server_id)

    if status is None:
        raise HTTPException(
            status_code=404,
            detail=f"Server '{server_id}' not found"
        )

    return status


@router.get("/servers/{server_id}/vms", response_model=VMListResponse)
async def get_server_vms(
    server_id: str,
    user: CurrentUser
) -> VMListResponse:
    """
    Get all VMs and containers for a server.
    """
    service = await get_proxmox_service()
    result = await service.get_all_vms(server_id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Server '{server_id}' not found or not accessible"
        )

    return result


@router.get("/servers/{server_id}/vm/{vmid}", response_model=VMInfo)
async def get_vm_details(
    server_id: str,
    vmid: int,
    user: CurrentUser,
    vm_type: Literal["qemu", "lxc"] = Query(default="qemu", description="VM type")
) -> VMInfo:
    """
    Get detailed information for a specific VM or container.
    """
    service = await get_proxmox_service()
    result = await service.get_vm_details(server_id, vmid, vm_type)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VM {vmid} not found on server '{server_id}'"
        )

    return result


@router.post("/servers/{server_id}/vm/{vmid}/{action}", response_model=VMActionResponse)
async def vm_action(
    server_id: str,
    vmid: int,
    action: Literal["start", "stop", "shutdown", "restart", "reset", "suspend", "resume"],
    user: CurrentUser,
    vm_type: Literal["qemu", "lxc"] = Query(default="qemu", description="VM type")
) -> VMActionResponse:
    """
    Execute action on a VM or container.

    Actions:
    - start: Start the VM/container
    - stop: Force stop (like pulling the power cord)
    - shutdown: Graceful shutdown via ACPI
    - restart: Restart (shutdown + start)
    - reset: Force reset (like pressing reset button)
    - suspend: Suspend to RAM
    - resume: Resume from suspend
    """
    service = await get_proxmox_service()
    result = await service.execute_vm_action(server_id, vmid, action, vm_type)

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )

    return result
