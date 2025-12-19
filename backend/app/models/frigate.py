"""Frigate NVR API models."""
from pydantic import BaseModel, Field


class CameraInfo(BaseModel):
    """Camera information from Frigate config."""
    name: str
    enabled: bool = True
    detect_enabled: bool = True
    record_enabled: bool = True
    snapshots_enabled: bool = True
    audio_enabled: bool = False
    width: int | None = None
    height: int | None = None
    fps: int | None = None


class CameraListResponse(BaseModel):
    """Response for cameras list endpoint."""
    cameras: list[CameraInfo]
    total: int


class FrigateEvent(BaseModel):
    """Frigate detection event."""
    id: str
    camera: str
    label: str  # person, car, dog, etc.
    sub_label: str | None = None
    score: float  # confidence 0-1
    top_score: float | None = None
    false_positive: bool | None = None
    start_time: float  # Unix timestamp
    end_time: float | None = None  # Unix timestamp
    has_clip: bool = False
    has_snapshot: bool = False
    thumbnail: str | None = None  # base64 encoded
    zones: list[str] = Field(default_factory=list)
    region: list[int] | None = None  # [x1, y1, x2, y2]
    box: list[int] | None = None  # [x1, y1, x2, y2]
    area: int | None = None  # bounding box area


class EventsResponse(BaseModel):
    """Response for events list endpoint."""
    events: list[FrigateEvent]
    total: int


class CameraStats(BaseModel):
    """Stats for a single camera."""
    camera_fps: float
    detection_fps: float
    capture_pid: int | None = None
    process_fps: float | None = None
    skipped_fps: float | None = None
    detection_enabled: bool | None = None


class DetectorStats(BaseModel):
    """Stats for a detector."""
    inference_speed: float  # ms
    detection_start: float | None = None  # timestamp
    pid: int | None = None


class FrigateStats(BaseModel):
    """System-wide Frigate stats."""
    cameras: dict[str, CameraStats] = Field(default_factory=dict)
    detectors: dict[str, DetectorStats] = Field(default_factory=dict)
    detection_fps: float | None = None
    cpu_usages: dict[str, dict] | None = None
    gpu_usages: dict[str, dict] | None = None
    service: dict | None = None
