"""Pydantic schemas for system health and storage orphan cleanup (US 05.3)."""

from pydantic import BaseModel, ConfigDict


class StorageHealthData(BaseModel):
    """Disk capacity metrics for the audio storage cache partition."""

    model_config = ConfigDict(extra="ignore")

    disk_used_percent: float
    threshold_status: str  # "NORMAL" (<85%), "WARNING" (85-94%), "CRITICAL" (>=95%)
    total_bytes: int
    used_bytes: int
    free_bytes: int
    audio_cache_bytes: int
    audio_cache_files: int


class SystemHealthData(BaseModel):
    """Overall server system health, storage telemetry, and service latency."""

    model_config = ConfigDict(extra="ignore")

    status: str
    disk_used_percent: float
    threshold_status: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    audio_cache_bytes: int
    audio_cache_files: int
    db_status: str
    db_latency_ms: float
    external_services_ok: bool
    storage: StorageHealthData


class SystemHealthResponse(BaseModel):
    """Standardized API response envelope for system health telemetry."""

    success: bool = True
    data: SystemHealthData


class CleanOrphansData(BaseModel):
    """Metrics produced after pruning unreferenced orphaned audio cache files."""

    model_config = ConfigDict(extra="ignore")

    deleted_count: int
    reclaimed_bytes: int
    reclaimed_mb: float
    remaining_files: int
    message: str


class CleanOrphansResponse(BaseModel):
    """Standardized API response envelope for audio cache pruning."""

    success: bool = True
    data: CleanOrphansData
