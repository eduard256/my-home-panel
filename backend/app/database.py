"""
Database module for SQLite with aiosqlite.
Handles metrics storage with automatic table creation and WAL mode.
"""
import aiosqlite
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from app.config import get_settings

logger = logging.getLogger(__name__)

# Global database connection
_db_connection: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    """Get database connection (must be initialized first)."""
    if _db_connection is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return _db_connection


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get database connection as context manager."""
    db = await get_db()
    try:
        yield db
    finally:
        await db.commit()


async def init_database() -> None:
    """Initialize database connection and create tables."""
    global _db_connection

    settings = get_settings()
    db_path = Path(settings.DATABASE_PATH)

    # Ensure data directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info(f"Initializing database at {db_path}")

    # Connect with WAL mode for better concurrency
    _db_connection = await aiosqlite.connect(str(db_path))
    _db_connection.row_factory = aiosqlite.Row

    # Enable WAL mode
    await _db_connection.execute("PRAGMA journal_mode=WAL")
    await _db_connection.execute("PRAGMA synchronous=NORMAL")
    await _db_connection.execute("PRAGMA cache_size=10000")

    # Create tables
    await _create_tables()

    logger.info("Database initialized successfully")


async def close_database() -> None:
    """Close database connection."""
    global _db_connection

    if _db_connection is not None:
        await _db_connection.close()
        _db_connection = None
        logger.info("Database connection closed")


async def _create_tables() -> None:
    """Create all required tables."""
    if _db_connection is None:
        return

    # Server metrics table (for Proxmox nodes)
    await _db_connection.execute("""
        CREATE TABLE IF NOT EXISTS server_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            cpu_percent REAL,
            memory_used INTEGER,
            memory_total INTEGER,
            disk_used INTEGER,
            disk_total INTEGER,
            network_in INTEGER,
            network_out INTEGER,
            uptime INTEGER,
            aggregation_level TEXT DEFAULT 'raw',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for server_metrics
    await _db_connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_server_metrics_server_time
        ON server_metrics(server_id, timestamp)
    """)
    await _db_connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_server_metrics_aggregation
        ON server_metrics(aggregation_level, timestamp)
    """)

    # VM/Container metrics table
    await _db_connection.execute("""
        CREATE TABLE IF NOT EXISTS vm_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id TEXT NOT NULL,
            vmid INTEGER NOT NULL,
            vm_type TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            status TEXT,
            cpu_percent REAL,
            memory_used INTEGER,
            memory_total INTEGER,
            disk_read INTEGER,
            disk_write INTEGER,
            network_in INTEGER,
            network_out INTEGER,
            uptime INTEGER,
            aggregation_level TEXT DEFAULT 'raw',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for vm_metrics
    await _db_connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_vm_metrics_server_vm_time
        ON vm_metrics(server_id, vmid, timestamp)
    """)
    await _db_connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_vm_metrics_aggregation
        ON vm_metrics(aggregation_level, timestamp)
    """)

    # Automation metrics table
    await _db_connection.execute("""
        CREATE TABLE IF NOT EXISTS automation_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            automation_name TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            status TEXT,
            health TEXT,
            triggers_count INTEGER,
            errors_count INTEGER,
            cpu_percent REAL,
            memory_mb REAL,
            aggregation_level TEXT DEFAULT 'raw',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for automation_metrics
    await _db_connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_automation_metrics_name_time
        ON automation_metrics(automation_name, timestamp)
    """)

    # Device states table (for MQTT devices)
    await _db_connection.execute("""
        CREATE TABLE IF NOT EXISTS device_states (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            payload TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for device_states
    await _db_connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_device_states_topic_time
        ON device_states(topic, timestamp)
    """)

    await _db_connection.commit()
    logger.info("Database tables created successfully")


# ============================================
# Server Metrics Operations
# ============================================

async def insert_server_metric(
    server_id: str,
    cpu_percent: float,
    memory_used: int,
    memory_total: int,
    disk_used: int,
    disk_total: int,
    network_in: int,
    network_out: int,
    uptime: int,
    aggregation_level: str = "raw"
) -> None:
    """Insert server metric."""
    db = await get_db()
    await db.execute(
        """
        INSERT INTO server_metrics
        (server_id, timestamp, cpu_percent, memory_used, memory_total,
         disk_used, disk_total, network_in, network_out, uptime, aggregation_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (server_id, datetime.utcnow(), cpu_percent, memory_used, memory_total,
         disk_used, disk_total, network_in, network_out, uptime, aggregation_level)
    )
    await db.commit()


async def get_server_metrics(
    server_id: str,
    start_time: datetime,
    end_time: datetime | None = None,
    aggregation_level: str | None = None,
    limit: int = 1000
) -> list[dict]:
    """Get server metrics for a time range."""
    db = await get_db()

    query = """
        SELECT * FROM server_metrics
        WHERE server_id = ? AND timestamp >= ?
    """
    params: list = [server_id, start_time]

    if end_time:
        query += " AND timestamp <= ?"
        params.append(end_time)

    if aggregation_level:
        query += " AND aggregation_level = ?"
        params.append(aggregation_level)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    return [dict(row) for row in rows]


# ============================================
# VM Metrics Operations
# ============================================

async def insert_vm_metric(
    server_id: str,
    vmid: int,
    vm_type: str,
    status: str,
    cpu_percent: float,
    memory_used: int,
    memory_total: int,
    disk_read: int,
    disk_write: int,
    network_in: int,
    network_out: int,
    uptime: int,
    aggregation_level: str = "raw"
) -> None:
    """Insert VM metric."""
    db = await get_db()
    await db.execute(
        """
        INSERT INTO vm_metrics
        (server_id, vmid, vm_type, timestamp, status, cpu_percent, memory_used,
         memory_total, disk_read, disk_write, network_in, network_out, uptime, aggregation_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (server_id, vmid, vm_type, datetime.utcnow(), status, cpu_percent,
         memory_used, memory_total, disk_read, disk_write, network_in, network_out,
         uptime, aggregation_level)
    )
    await db.commit()


async def get_vm_metrics(
    server_id: str,
    vmid: int,
    start_time: datetime,
    end_time: datetime | None = None,
    aggregation_level: str | None = None,
    limit: int = 1000
) -> list[dict]:
    """Get VM metrics for a time range."""
    db = await get_db()

    query = """
        SELECT * FROM vm_metrics
        WHERE server_id = ? AND vmid = ? AND timestamp >= ?
    """
    params: list = [server_id, vmid, start_time]

    if end_time:
        query += " AND timestamp <= ?"
        params.append(end_time)

    if aggregation_level:
        query += " AND aggregation_level = ?"
        params.append(aggregation_level)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    return [dict(row) for row in rows]


# ============================================
# Automation Metrics Operations
# ============================================

async def insert_automation_metric(
    automation_name: str,
    status: str,
    health: str,
    triggers_count: int,
    errors_count: int,
    cpu_percent: float,
    memory_mb: float,
    aggregation_level: str = "raw"
) -> None:
    """Insert automation metric."""
    db = await get_db()
    await db.execute(
        """
        INSERT INTO automation_metrics
        (automation_name, timestamp, status, health, triggers_count,
         errors_count, cpu_percent, memory_mb, aggregation_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (automation_name, datetime.utcnow(), status, health, triggers_count,
         errors_count, cpu_percent, memory_mb, aggregation_level)
    )
    await db.commit()


async def get_automation_metrics(
    automation_name: str,
    start_time: datetime,
    end_time: datetime | None = None,
    limit: int = 1000
) -> list[dict]:
    """Get automation metrics for a time range."""
    db = await get_db()

    query = """
        SELECT * FROM automation_metrics
        WHERE automation_name = ? AND timestamp >= ?
    """
    params: list = [automation_name, start_time]

    if end_time:
        query += " AND timestamp <= ?"
        params.append(end_time)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    return [dict(row) for row in rows]


# ============================================
# Device States Operations
# ============================================

async def insert_device_state(topic: str, payload: str) -> None:
    """Insert device state change."""
    db = await get_db()
    await db.execute(
        """
        INSERT INTO device_states (topic, timestamp, payload)
        VALUES (?, ?, ?)
        """,
        (topic, datetime.utcnow(), payload)
    )
    await db.commit()


async def get_device_states(
    topic: str,
    start_time: datetime,
    end_time: datetime | None = None,
    limit: int = 1000
) -> list[dict]:
    """Get device state history."""
    db = await get_db()

    query = """
        SELECT * FROM device_states
        WHERE topic = ? AND timestamp >= ?
    """
    params: list = [topic, start_time]

    if end_time:
        query += " AND timestamp <= ?"
        params.append(end_time)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    return [dict(row) for row in rows]


# ============================================
# Cleanup Operations (for downsampling)
# ============================================

async def delete_old_metrics(
    table: str,
    aggregation_level: str,
    before_timestamp: datetime
) -> int:
    """Delete metrics older than specified timestamp."""
    db = await get_db()

    cursor = await db.execute(
        f"""
        DELETE FROM {table}
        WHERE aggregation_level = ? AND timestamp < ?
        """,
        (aggregation_level, before_timestamp)
    )
    await db.commit()

    return cursor.rowcount


async def get_metrics_count(table: str, aggregation_level: str) -> int:
    """Get count of metrics at specified aggregation level."""
    db = await get_db()

    cursor = await db.execute(
        f"""
        SELECT COUNT(*) FROM {table}
        WHERE aggregation_level = ?
        """,
        (aggregation_level,)
    )
    row = await cursor.fetchone()

    return row[0] if row else 0
