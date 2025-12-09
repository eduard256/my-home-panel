"""
Metrics collection tasks.
Periodically collects metrics from Proxmox servers and VMs.
"""
import asyncio
import logging

from app.services.proxmox import get_proxmox_service
from app.database import insert_server_metric, insert_vm_metric

logger = logging.getLogger(__name__)


async def collect_server_metrics() -> None:
    """
    Collect metrics from all Proxmox servers.
    Runs periodically (default: every 10 seconds).
    """
    try:
        service = await get_proxmox_service()
        servers = await service.get_all_servers_status()

        for server in servers:
            if not server.online:
                logger.debug(f"Server {server.id} offline, skipping metrics")
                continue

            try:
                await insert_server_metric(
                    server_id=server.id,
                    cpu_percent=server.cpu or 0,
                    memory_used=server.memory_used or 0,
                    memory_total=server.memory_total or 0,
                    disk_used=server.disk_used or 0,
                    disk_total=server.disk_total or 0,
                    network_in=server.network_in or 0,
                    network_out=server.network_out or 0,
                    uptime=server.uptime or 0,
                    aggregation_level="raw"
                )
                logger.debug(f"Collected metrics for server {server.id}")
            except Exception as e:
                logger.error(f"Failed to insert metrics for server {server.id}: {e}")

    except Exception as e:
        logger.error(f"Server metrics collection failed: {e}")


async def collect_vm_metrics() -> None:
    """
    Collect metrics from all VMs and containers.
    Runs periodically (default: every 30 seconds).
    """
    try:
        service = await get_proxmox_service()
        servers = await service.get_all_servers_status()

        for server in servers:
            if not server.online:
                logger.debug(f"Server {server.id} offline, skipping VM metrics")
                continue

            try:
                # Get all VMs for this server
                vms_response = await service.get_all_vms(server.id)
                if vms_response is None:
                    continue

                for vm in vms_response.vms:
                    # Skip templates
                    if vm.template:
                        continue

                    try:
                        await insert_vm_metric(
                            server_id=server.id,
                            vmid=vm.vmid,
                            vm_type=vm.type,
                            status=vm.status,
                            cpu_percent=vm.cpu_percent or 0,
                            memory_used=vm.memory_used or 0,
                            memory_total=vm.memory_total or 0,
                            disk_read=vm.disk_read or 0,
                            disk_write=vm.disk_write or 0,
                            network_in=vm.network_in or 0,
                            network_out=vm.network_out or 0,
                            uptime=vm.uptime or 0,
                            aggregation_level="raw"
                        )
                        logger.debug(f"Collected metrics for VM {vm.vmid} on {server.id}")
                    except Exception as e:
                        logger.error(f"Failed to insert metrics for VM {vm.vmid}: {e}")

            except Exception as e:
                logger.error(f"Failed to collect VM metrics from {server.id}: {e}")

    except Exception as e:
        logger.error(f"VM metrics collection failed: {e}")


async def collect_automation_metrics() -> None:
    """
    Collect metrics from all automations.
    Called separately from MQTT tracker or on-demand.
    """
    try:
        from app.services.automation import get_automation_service
        from app.database import insert_automation_metric

        service = await get_automation_service()
        automations = await service.get_automations()

        for auto in automations.automations:
            try:
                # Get stats if available
                stats = await service.get_stats(auto.container_name)
                cpu_percent = 0.0
                memory_mb = 0.0

                if stats and not isinstance(stats, list):
                    cpu_percent = stats.cpu.get("percent", 0)
                    memory_mb = stats.memory.get("used_mb", 0)

                # Get trigger counts from MQTT status
                triggers_count = 0
                errors_count = 0
                if auto.mqtt and auto.mqtt.status:
                    triggers_count = auto.mqtt.status.triggers_count or 0
                    errors_count = auto.mqtt.status.errors_count or 0

                await insert_automation_metric(
                    automation_name=auto.automation_name,
                    status=auto.container.status,
                    health=auto.health.overall,
                    triggers_count=triggers_count,
                    errors_count=errors_count,
                    cpu_percent=cpu_percent,
                    memory_mb=memory_mb,
                    aggregation_level="raw"
                )
                logger.debug(f"Collected metrics for automation {auto.automation_name}")
            except Exception as e:
                logger.error(f"Failed to insert metrics for automation {auto.automation_name}: {e}")

    except Exception as e:
        logger.error(f"Automation metrics collection failed: {e}")
