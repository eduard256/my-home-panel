"""
Configuration module using pydantic-settings.
Loads all settings from .env file.
"""
import secrets
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # === Core ===
    ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    ENABLE_MOCK_DATA: bool = False

    # === Server ===
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # === Authentication ===
    ACCESS_TOKEN: str
    JWT_SECRET: str = "auto-generated-on-first-start"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # === Proxmox NAS (10.0.10.10) ===
    PROXMOX_NAS_IP: str = "10.0.10.10"
    PROXMOX_NAS_API_URL: str = "https://10.0.10.10:8006/api2/json"
    PROXMOX_NAS_API_USER: str = "root@pam!test"
    PROXMOX_NAS_API_TOKEN: str = ""
    PROXMOX_NAS_NODE: str = "nas"

    # === Proxmox Smart Home (10.0.20.10) ===
    PROXMOX_SMART_IP: str = "10.0.20.10"
    PROXMOX_SMART_API_URL: str = "https://10.0.20.10:8006/api2/json"
    PROXMOX_SMART_API_USER: str = "root@pam!test"
    PROXMOX_SMART_API_TOKEN: str = ""
    PROXMOX_SMART_NODE: str = "pve"

    # === Frigate ===
    FRIGATE_URL: str = "http://10.0.10.3:5000"

    # === go2rtc (WebRTC streaming) ===
    GO2RTC_URL: str = "http://10.0.10.3:1984"

    # === MQTT API ===
    MQTT_API_URL: str = "http://10.0.20.102:8081"
    MQTT_API_USER: str = "admin"
    MQTT_API_PASSWORD: str = ""

    # === Automation API ===
    AUTOMATION_API_URL: str = "http://10.0.20.102:8080"
    AUTOMATION_API_USER: str = "admin"
    AUTOMATION_API_PASSWORD: str = ""

    # === AI Hub (Claude Code API) ===
    AI_HUB_URL: str = "http://10.99.10.106:9876"
    AI_HUB_USER: str = "admin"
    AI_HUB_PASSWORD: str = ""

    # === Database ===
    DATABASE_PATH: str = "./data/metrics.db"

    # === Metrics Collection Intervals (seconds) ===
    METRICS_INTERVAL_SERVERS: int = 10
    METRICS_INTERVAL_VMS: int = 30

    # === Metrics Retention (seconds) ===
    METRICS_RETENTION_RAW: int = 3600          # 1 hour
    METRICS_RETENTION_MINUTE: int = 86400      # 24 hours
    METRICS_RETENTION_FIVE_MIN: int = 604800   # 7 days
    METRICS_RETENTION_THIRTY_MIN: int = 2592000  # 30 days
    METRICS_RETENTION_HOUR: int = 31536000     # 1 year

    def get_jwt_secret(self) -> str:
        """Get or generate JWT secret."""
        if self.JWT_SECRET == "auto-generated-on-first-start":
            # Generate a secure random secret
            return secrets.token_urlsafe(32)
        return self.JWT_SECRET

    @property
    def proxmox_servers(self) -> dict:
        """Get Proxmox servers configuration as a dict."""
        return {
            "nas": {
                "id": "nas",
                "name": "NAS Server",
                "ip": self.PROXMOX_NAS_IP,
                "api_url": self.PROXMOX_NAS_API_URL,
                "api_user": self.PROXMOX_NAS_API_USER,
                "api_token": self.PROXMOX_NAS_API_TOKEN,
                "node": self.PROXMOX_NAS_NODE
            },
            "smart": {
                "id": "smart",
                "name": "Smart Home Server",
                "ip": self.PROXMOX_SMART_IP,
                "api_url": self.PROXMOX_SMART_API_URL,
                "api_user": self.PROXMOX_SMART_API_USER,
                "api_token": self.PROXMOX_SMART_API_TOKEN,
                "node": self.PROXMOX_SMART_NODE
            }
        }


# Singleton JWT secret (generated once at startup)
_jwt_secret: str | None = None


def get_jwt_secret() -> str:
    """Get JWT secret (singleton)."""
    global _jwt_secret
    if _jwt_secret is None:
        settings = get_settings()
        _jwt_secret = settings.get_jwt_secret()
    return _jwt_secret


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
