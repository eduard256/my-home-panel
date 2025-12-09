"""Proxmox API models."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class ServerInfo(BaseModel):
    """Basic server information."""
    id: str
    name: str
    ip: str
    node: str
    online: bool
    uptime: int | None = None  # seconds


class ServerStatus(BaseModel):
    """Detailed server status with resource usage."""
    id: str
    name: str
    ip: str
    node: str
    online: bool
    uptime: int | None = None
    cpu: float | None = None  # 0-100 percent
    memory_used: int | None = None  # bytes
    memory_total: int | None = None  # bytes
    memory_percent: float | None = None  # 0-100 percent
    disk_used: int | None = None  # bytes
    disk_total: int | None = None  # bytes
    disk_percent: float | None = None  # 0-100 percent
    network_in: int | None = None  # bytes
    network_out: int | None = None  # bytes
    load_average: list[float] | None = None  # [1min, 5min, 15min]
    vms_running: int = 0
    vms_total: int = 0
    cts_running: int = 0
    cts_total: int = 0


class ServerListResponse(BaseModel):
    """Response for server list endpoint."""
    servers: list[ServerStatus]
    total: int


class VMInfo(BaseModel):
    """VM or Container information."""
    vmid: int
    name: str
    type: Literal["qemu", "lxc"]
    status: str  # running, stopped, paused, etc.
    cpu: float | None = None  # 0-1 fraction
    cpu_percent: float | None = None  # 0-100 percent
    cpus: int | None = None  # number of CPUs
    memory_used: int | None = None  # bytes
    memory_total: int | None = None  # bytes (maxmem)
    memory_percent: float | None = None  # 0-100 percent
    disk_used: int | None = None  # bytes (disk)
    disk_total: int | None = None  # bytes (maxdisk)
    disk_read: int | None = None  # bytes
    disk_write: int | None = None  # bytes
    network_in: int | None = None  # bytes
    network_out: int | None = None  # bytes
    uptime: int | None = None  # seconds
    tags: list[str] = Field(default_factory=list)
    template: bool = False


class VMListResponse(BaseModel):
    """Response for VM list endpoint."""
    server_id: str
    vms: list[VMInfo]
    total: int
    running: int
    stopped: int


class VMActionRequest(BaseModel):
    """Request for VM action."""
    action: Literal["start", "stop", "shutdown", "restart", "reset", "suspend", "resume"]


class VMActionResponse(BaseModel):
    """Response for VM action endpoint."""
    success: bool
    server_id: str
    vmid: int
    action: str
    message: str
    upid: str | None = None  # Proxmox task ID
