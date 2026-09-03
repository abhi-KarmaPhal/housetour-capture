from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Common 3D Math Types (Right-Handed, Y-Up, Meters)
# -----------------------------------------------------------------------------
class Vec3(BaseModel):
    x: float
    y: float
    z: float


class Quat(BaseModel):
    x: float
    y: float
    z: float
    w: float


class BoundingBox(BaseModel):
    min: Vec3
    max: Vec3


# -----------------------------------------------------------------------------
# 1. Scan Package Schemas (myhouse.scan Input Contract)
# -----------------------------------------------------------------------------
class ScanManifest(BaseModel):
    format: str = "house_scan"
    version: str = "1.0"
    created_by: str = "RecorderApp"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ScanMetadata(BaseModel):
    house_name: str = "Untitled Property"
    client_id: str = "client_default"
    address: str = "Unknown Location"
    capture_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    notes: Optional[str] = "Captured with mobile device"


class CameraSpecs(BaseModel):
    resolution: str = "1920x1080"
    fps: int = 30
    lens: str = "wide"


class DeviceInfo(BaseModel):
    id: str = "device_01"
    platform: str = "ios"
    model: str = "iPhone 13"
    os_version: str = "17.0"
    app_version: str = "1.0.0"
    camera_specs: Optional[CameraSpecs] = Field(default_factory=CameraSpecs)


class DevicesDocument(BaseModel):
    devices: List[DeviceInfo] = Field(default_factory=list)


class ScanRoomItem(BaseModel):
    id: str
    name: str
    order: int
    video: str
    imu: Optional[str] = None
    poses: Optional[str] = None
    thumbnail: Optional[str] = None


class ScanRoomsDocument(BaseModel):
    rooms: List[ScanRoomItem] = Field(default_factory=list)


class PoseEntry(BaseModel):
    frame_index: int
    timestamp_s: float
    position: Vec3
    rotation_quat: Quat


class PosesDocument(BaseModel):
    frame_rate: int = 30
    poses: List[PoseEntry] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# 2. Tour Package Schemas (myhouse.tour Output Contract)
# -----------------------------------------------------------------------------
class TourManifest(BaseModel):
    format: str = "house_tour"
    version: str = "1.0"
    created_by: str = "BuilderService"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).astimezone().isoformat())
    source_scan: str = "raw_videos"
    builder_version: str = "1.0.0"


class TourMetadata(BaseModel):
    house_name: str = "Sample House"
    client_id: str = "client_001"
    address: str = "Unknown"
    capture_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    build_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    notes: str = "Auto-built from scan, LODs: high/mid/low"


class TourRoomItem(BaseModel):
    id: str
    name: str
    centroid: Vec3
    bounds: BoundingBox


class TourRoomsDocument(BaseModel):
    rooms: List[TourRoomItem] = Field(default_factory=list)


class NavPolygon(BaseModel):
    id: str
    vertices: List[Vec3]


class NavmeshDocument(BaseModel):
    version: str = "1.0"
    units: str = "meters"
    y_up: bool = True
    polygons: List[NavPolygon] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# 3. REST API Payloads & Job Telemetry
# -----------------------------------------------------------------------------
class JobCreateResponse(BaseModel):
    job_id: str
    status: str = "pending"
    message: str = "Job created successfully and queued for processing"
    created_at: str


class StageLogEntry(BaseModel):
    stage: str
    status: str  # "started", "completed", "failed", "skipped"
    timestamp: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "ready", "failed"
    progress: int = Field(default=0, ge=0, le=100)
    current_stage: Optional[str] = None
    house_name: Optional[str] = None
    client_id: Optional[str] = None
    created_at: str
    updated_at: str
    tour_url: Optional[str] = None
    error: Optional[str] = None
    logs: List[StageLogEntry] = Field(default_factory=list)
    rooms_count: Optional[int] = 0
    file_size_bytes: Optional[int] = None


class JobSummary(BaseModel):
    job_id: str
    status: str
    progress: int
    current_stage: Optional[str]
    house_name: str
    client_id: str
    created_at: str
    tour_url: Optional[str] = None
    file_size_bytes: Optional[int] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "HouseTour Builder Service"
    version: str = "1.0.0"
    uptime_seconds: float
    active_jobs: int
    completed_jobs: int
    storage: Dict[str, Any]
