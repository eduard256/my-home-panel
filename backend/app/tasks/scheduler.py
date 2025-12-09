"""
APScheduler setup for background tasks.
Manages periodic metrics collection and maintenance tasks.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    """Get or create scheduler instance."""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


async def start_scheduler() -> None:
    """Start the background task scheduler."""
    global scheduler
    settings = get_settings()

    if scheduler is None:
        scheduler = AsyncIOScheduler()

    # Import tasks here to avoid circular imports
    from app.tasks.metrics_collector import collect_server_metrics, collect_vm_metrics
    from app.tasks.downsampling import run_downsampling

    # Server metrics collection (every 10 seconds by default)
    scheduler.add_job(
        collect_server_metrics,
        IntervalTrigger(seconds=settings.METRICS_INTERVAL_SERVERS),
        id="collect_server_metrics",
        name="Collect Server Metrics",
        replace_existing=True,
        max_instances=1
    )

    # VM metrics collection (every 30 seconds by default)
    scheduler.add_job(
        collect_vm_metrics,
        IntervalTrigger(seconds=settings.METRICS_INTERVAL_VMS),
        id="collect_vm_metrics",
        name="Collect VM Metrics",
        replace_existing=True,
        max_instances=1
    )

    # Daily downsampling (at 3:00 AM)
    scheduler.add_job(
        run_downsampling,
        CronTrigger(hour=3, minute=0),
        id="run_downsampling",
        name="Metrics Downsampling",
        replace_existing=True,
        max_instances=1
    )

    scheduler.start()
    logger.info("Background task scheduler started")

    # Log scheduled jobs
    for job in scheduler.get_jobs():
        logger.info(f"Scheduled job: {job.name} ({job.id})")


async def stop_scheduler() -> None:
    """Stop the background task scheduler."""
    global scheduler

    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background task scheduler stopped")

    scheduler = None


def pause_scheduler() -> None:
    """Pause all scheduled jobs."""
    global scheduler
    if scheduler is not None:
        scheduler.pause()
        logger.info("Scheduler paused")


def resume_scheduler() -> None:
    """Resume all scheduled jobs."""
    global scheduler
    if scheduler is not None:
        scheduler.resume()
        logger.info("Scheduler resumed")
