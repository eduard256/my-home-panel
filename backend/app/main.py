"""
Home Panel Backend - Main Application.

FastAPI application with:
- REST API for home automation management
- SSE streaming for real-time updates
- Background tasks for metrics collection
- JWT authentication
"""
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings, get_jwt_secret
from app.database import init_database, close_database
from app.services.proxmox import get_proxmox_service, close_proxmox_service
from app.services.frigate import get_frigate_service, close_frigate_service
from app.services.mqtt_api import get_mqtt_service, close_mqtt_service
from app.services.automation import get_automation_service, close_automation_service
from app.services.ai_hub import get_ai_hub_service, close_ai_hub_service
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.tasks.mqtt_tracker import start_mqtt_tracker, stop_mqtt_tracker

# Import routers
from app.routers import auth, proxmox, frigate, mqtt, automations, ai, metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Startup time for health check
_startup_time: datetime | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    global _startup_time

    logger.info("Starting Home Panel Backend...")
    settings = get_settings()

    # Log configuration (without secrets)
    logger.info(f"Environment: {settings.ENV}")
    logger.info(f"Server: {settings.HOST}:{settings.PORT}")
    logger.info(f"Log level: {settings.LOG_LEVEL}")

    # Set log level
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    try:
        # Initialize database
        await init_database()

        # Initialize JWT secret (will auto-generate if needed)
        jwt_secret = get_jwt_secret()
        logger.info("JWT secret initialized")

        # Initialize services
        await get_proxmox_service()
        logger.info("Proxmox service initialized")

        await get_frigate_service()
        logger.info("Frigate service initialized")

        await get_mqtt_service()
        logger.info("MQTT service initialized")

        await get_automation_service()
        logger.info("Automation service initialized")

        await get_ai_hub_service()
        logger.info("AI Hub service initialized")

        # Start background tasks
        await start_scheduler()
        logger.info("Background scheduler started")

        # Start MQTT state tracker
        await start_mqtt_tracker()
        logger.info("MQTT state tracker started")

        _startup_time = datetime.utcnow()
        logger.info("Home Panel Backend started successfully")

        yield

    finally:
        logger.info("Shutting down Home Panel Backend...")

        # Stop background tasks
        await stop_scheduler()
        await stop_mqtt_tracker()

        # Close services
        await close_ai_hub_service()
        await close_automation_service()
        await close_mqtt_service()
        await close_frigate_service()
        await close_proxmox_service()

        # Close database
        await close_database()

        logger.info("Home Panel Backend stopped")


# Create FastAPI app
app = FastAPI(
    title="Home Panel Backend",
    description="REST API for home automation management",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Health check endpoint (no auth required)
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Returns service status, version, and uptime.
    """
    settings = get_settings()

    uptime_seconds = 0
    if _startup_time:
        uptime_seconds = int((datetime.utcnow() - _startup_time).total_seconds())

    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENV,
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.utcnow().isoformat()
    }


# Include routers
app.include_router(auth.router)
app.include_router(proxmox.router)
app.include_router(frigate.router)
app.include_router(mqtt.router)
app.include_router(automations.router)
app.include_router(ai.router)
app.include_router(metrics.router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Home Panel Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENV == "development"
    )
