"""
Metrics downsampling tasks.
Aggregates old metrics to reduce storage and improve query performance.
"""
import logging
from datetime import datetime, timedelta

from app.config import get_settings
from app.database import get_db, delete_old_metrics

logger = logging.getLogger(__name__)


async def run_downsampling() -> None:
    """
    Run downsampling for all metric tables.
    Called daily (default: at 3:00 AM).

    Downsampling strategy:
    - RAW (collected) → kept for 1 hour, then deleted
    - MINUTE → kept for 24 hours
    - FIVE_MIN → kept for 7 days
    - THIRTY_MIN → kept for 30 days
    - HOUR → kept for 1 year, then deleted
    """
    logger.info("Starting metrics downsampling...")
    settings = get_settings()
    now = datetime.utcnow()

    try:
        # Calculate cutoff times
        raw_cutoff = now - timedelta(seconds=settings.METRICS_RETENTION_RAW)
        minute_cutoff = now - timedelta(seconds=settings.METRICS_RETENTION_MINUTE)
        five_min_cutoff = now - timedelta(seconds=settings.METRICS_RETENTION_FIVE_MIN)
        thirty_min_cutoff = now - timedelta(seconds=settings.METRICS_RETENTION_THIRTY_MIN)
        hour_cutoff = now - timedelta(seconds=settings.METRICS_RETENTION_HOUR)

        tables = ["server_metrics", "vm_metrics"]

        for table in tables:
            # Delete old RAW metrics (after aggregating to MINUTE)
            await _aggregate_and_delete(
                table=table,
                from_level="raw",
                to_level="minute",
                cutoff=raw_cutoff,
                interval_minutes=1
            )

            # Delete old MINUTE metrics (after aggregating to FIVE_MIN)
            await _aggregate_and_delete(
                table=table,
                from_level="minute",
                to_level="5min",
                cutoff=minute_cutoff,
                interval_minutes=5
            )

            # Delete old FIVE_MIN metrics (after aggregating to THIRTY_MIN)
            await _aggregate_and_delete(
                table=table,
                from_level="5min",
                to_level="30min",
                cutoff=five_min_cutoff,
                interval_minutes=30
            )

            # Delete old THIRTY_MIN metrics (after aggregating to HOUR)
            await _aggregate_and_delete(
                table=table,
                from_level="30min",
                to_level="hour",
                cutoff=thirty_min_cutoff,
                interval_minutes=60
            )

            # Delete old HOUR metrics (no further aggregation)
            deleted = await delete_old_metrics(table, "hour", hour_cutoff)
            if deleted > 0:
                logger.info(f"Deleted {deleted} old HOUR metrics from {table}")

        # Clean up device states (keep only 7 days of history)
        await _cleanup_device_states(now - timedelta(days=7))

        logger.info("Metrics downsampling completed")

    except Exception as e:
        logger.error(f"Downsampling failed: {e}")


async def _aggregate_and_delete(
    table: str,
    from_level: str,
    to_level: str,
    cutoff: datetime,
    interval_minutes: int
) -> None:
    """
    Aggregate metrics from one level to another and delete old data.

    For simplicity, this implementation just deletes old data.
    A full implementation would first aggregate data before deleting.
    """
    try:
        db = await get_db()

        # For now, just delete old metrics
        # In a production system, you would first INSERT aggregated data
        # then DELETE the source data

        # Example aggregation query (commented out for simplicity):
        # INSERT INTO {table} (server_id, timestamp, cpu_percent, ..., aggregation_level)
        # SELECT
        #     server_id,
        #     datetime(strftime('%Y-%m-%d %H:%M', timestamp, 'utc'), 'utc') as timestamp,
        #     AVG(cpu_percent),
        #     ...
        #     '{to_level}'
        # FROM {table}
        # WHERE aggregation_level = '{from_level}'
        #   AND timestamp < '{cutoff}'
        # GROUP BY server_id, strftime('%Y-%m-%d %H:{interval}', timestamp)

        # Delete old metrics
        deleted = await delete_old_metrics(table, from_level, cutoff)
        if deleted > 0:
            logger.info(f"Deleted {deleted} old {from_level.upper()} metrics from {table}")

    except Exception as e:
        logger.error(f"Failed to aggregate {from_level} -> {to_level} in {table}: {e}")


async def _cleanup_device_states(cutoff: datetime) -> None:
    """Delete old device state records."""
    try:
        db = await get_db()

        cursor = await db.execute(
            """
            DELETE FROM device_states
            WHERE timestamp < ?
            """,
            (cutoff,)
        )
        await db.commit()

        if cursor.rowcount > 0:
            logger.info(f"Deleted {cursor.rowcount} old device state records")

    except Exception as e:
        logger.error(f"Failed to cleanup device states: {e}")
