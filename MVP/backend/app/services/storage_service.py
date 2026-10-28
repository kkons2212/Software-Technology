"""Storage monitoring and orphan audio pruning service (US 05.3).

Measures disk capacity for the static audio partition, provides 3-tier
threshold alerts (<85% Normal, 85-94% Warning, >=95% Critical), and prunes
unreferenced MP3 files from physical cache while logging audit events.
"""

import logging
import os
import shutil
from pathlib import Path

from app.core.config import Settings, get_settings
from app.repositories.audio_repository import AudioRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.system_schema import (
    CleanOrphansData,
    StorageHealthData,
    SystemHealthData,
)

logger = logging.getLogger(__name__)

STORAGE_WARNING_THRESHOLD_PERCENT = 85.0
STORAGE_CRITICAL_THRESHOLD_PERCENT = 95.0
AUDIT_ACTION_CLEAN_ORPHANS = "ADMIN_STORAGE_CLEANED"


class StorageService:
    """Monitors static audio disk usage and prunes unreferenced MP3 cache files."""

    def __init__(
        self,
        audio_repository: AudioRepository,
        audit_repository: AuditRepository,
        audio_dir: Path | None = None,
        settings: Settings | None = None,
    ):
        self.audio_repository = audio_repository
        self.audit_repository = audit_repository
        self.settings = settings or get_settings()
        self.audio_dir = (
            audio_dir
            if audio_dir is not None
            else Path(self.settings.STATIC_DIR) / "audio"
        )

    def get_system_health(self) -> SystemHealthData:
        """Inspect server disk capacity, audio cache usage, and database status."""
        self.audio_dir.mkdir(parents=True, exist_ok=True)

        try:
            total_bytes, used_bytes, free_bytes = shutil.disk_usage(self.audio_dir)
        except OSError as exc:
            logger.warning("Could not read disk usage for %s: %s", self.audio_dir, exc)
            total_bytes, used_bytes, free_bytes = 1, 0, 1

        disk_used_percent = (
            round((used_bytes / total_bytes) * 100, 1) if total_bytes > 0 else 0.0
        )

        if disk_used_percent >= STORAGE_CRITICAL_THRESHOLD_PERCENT:
            threshold_status = "CRITICAL"
        elif disk_used_percent >= STORAGE_WARNING_THRESHOLD_PERCENT:
            threshold_status = "WARNING"
        else:
            threshold_status = "NORMAL"

        audio_cache_bytes = 0
        audio_cache_files = 0
        if self.audio_dir.exists():
            for entry in os.scandir(self.audio_dir):
                if entry.is_file() and entry.name.lower().endswith(".mp3"):
                    audio_cache_files += 1
                    try:
                        audio_cache_bytes += entry.stat().st_size
                    except OSError:
                        pass

        try:
            db_latency_ms = self.audio_repository.ping_database()
            db_status = "connected"
        except Exception as exc:
            logger.warning("Database health ping failed: %s", exc)
            db_status = "error"
            db_latency_ms = -1.0

        storage_data = StorageHealthData(
            disk_used_percent=disk_used_percent,
            threshold_status=threshold_status,
            total_bytes=total_bytes,
            used_bytes=used_bytes,
            free_bytes=free_bytes,
            audio_cache_bytes=audio_cache_bytes,
            audio_cache_files=audio_cache_files,
        )

        return SystemHealthData(
            status="ok" if db_status == "connected" else "degraded",
            disk_used_percent=disk_used_percent,
            threshold_status=threshold_status,
            total_bytes=total_bytes,
            used_bytes=used_bytes,
            free_bytes=free_bytes,
            audio_cache_bytes=audio_cache_bytes,
            audio_cache_files=audio_cache_files,
            db_status=db_status,
            db_latency_ms=db_latency_ms,
            external_services_ok=True,
            storage=storage_data,
        )

    def prune_orphaned_audio_files(
        self,
        admin_username: str,
        client_ip: str | None = None,
    ) -> CleanOrphansData:
        """Scan physical audio cache, unlink unreferenced MP3s, and record audit log."""
        referenced_urls = self.audio_repository.get_all_audio_urls()
        referenced_filenames = {os.path.basename(url) for url in referenced_urls if url}

        self.audio_dir.mkdir(parents=True, exist_ok=True)

        deleted_count = 0
        reclaimed_bytes = 0
        remaining_files = 0

        for entry in os.scandir(self.audio_dir):
            if not entry.is_file():
                continue
            name = entry.name
            if not name.lower().endswith(".mp3"):
                continue
            # Skip hidden and temporary files
            if name.startswith("."):
                continue

            if name not in referenced_filenames:
                try:
                    file_size = entry.stat().st_size
                    os.unlink(entry.path)
                    deleted_count += 1
                    reclaimed_bytes += file_size
                except OSError as exc:
                    logger.warning(
                        "Failed to delete orphan file %s: %s", entry.path, exc
                    )
            else:
                remaining_files += 1

        reclaimed_mb = round(reclaimed_bytes / (1024 * 1024), 2)

        # Log administrative audit event
        try:
            self.audit_repository.log_action(
                username=admin_username,
                status="SUCCESS",
                ip_address=client_ip,
                details=f"CLEAN_ORPHANS_{deleted_count}_FILES_{reclaimed_mb}_MB",
            )
        except Exception as exc:
            logger.warning("Audit logging failed for clean orphans: %s", exc)

        return CleanOrphansData(
            deleted_count=deleted_count,
            reclaimed_bytes=reclaimed_bytes,
            reclaimed_mb=reclaimed_mb,
            remaining_files=remaining_files,
            message=(
                f"Successfully cleaned {deleted_count} orphaned audio files, "
                f"freeing {reclaimed_mb} MB."
            ),
        )
