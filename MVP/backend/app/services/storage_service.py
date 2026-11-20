"""Storage monitoring and orphan audio pruning service (US 05.3).

Measures disk capacity for the static audio partition, provides 3-tier
threshold alerts (<85% Normal, 85-94% Warning, >=95% Critical), and prunes
unreferenced MP3 files from physical cache while logging audit events.
"""

import logging
import os
from pathlib import Path

from app.core.config import Settings, get_settings
from app.repositories.audio_repository import AudioRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
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
        poi_repository: POIRepository | None = None,
        audio_dir: Path | None = None,
        image_dir: Path | None = None,
        settings: Settings | None = None,
    ):
        self.audio_repository = audio_repository
        self.audit_repository = audit_repository
        self.poi_repository = poi_repository
        self.settings = settings or get_settings()
        self.audio_dir = (
            audio_dir
            if audio_dir is not None
            else Path(self.settings.STATIC_DIR) / "audio"
        )
        self.image_dir = (
            image_dir
            if image_dir is not None
            else Path(self.settings.STATIC_DIR) / "images"
        )

    def get_system_health(self) -> SystemHealthData:
        """Inspect media storage capacity against 1GB quota, audio cache usage, images, and database status."""
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.image_dir.mkdir(parents=True, exist_ok=True)

        audio_cache_bytes, audio_cache_files = self._measure_audio_cache()
        image_bytes, image_files = self._measure_images()

        total_bytes, used_bytes, free_bytes = self._sample_disk_usage(
            audio_bytes=audio_cache_bytes, image_bytes=image_bytes
        )
        disk_used_percent = self._calculate_disk_used_percent(total_bytes, used_bytes)
        threshold_status = self._resolve_threshold_status(disk_used_percent)
        db_status, db_latency_ms = self._sample_database_health()

        storage_data = StorageHealthData(
            disk_used_percent=disk_used_percent,
            threshold_status=threshold_status,
            total_bytes=total_bytes,
            used_bytes=used_bytes,
            free_bytes=free_bytes,
            audio_cache_bytes=audio_cache_bytes,
            audio_cache_files=audio_cache_files,
            image_bytes=image_bytes,
            image_files=image_files,
        )

        resolved_health = SystemHealthData(
            status="ok" if db_status == "connected" else "degraded",
            disk_used_percent=disk_used_percent,
            threshold_status=threshold_status,
            total_bytes=total_bytes,
            used_bytes=used_bytes,
            free_bytes=free_bytes,
            audio_cache_bytes=audio_cache_bytes,
            audio_cache_files=audio_cache_files,
            image_bytes=image_bytes,
            image_files=image_files,
            db_status=db_status,
            db_latency_ms=db_latency_ms,
            external_services_ok=True,
            storage=storage_data,
        )
        return resolved_health

    def _sample_disk_usage(
        self, audio_bytes: int = 0, image_bytes: int = 0
    ) -> tuple[int, int, int]:
        total_bytes = getattr(self.settings, "STORAGE_QUOTA_BYTES", 1024 * 1024 * 1024)
        used_bytes = audio_bytes + image_bytes
        free_bytes = max(0, total_bytes - used_bytes)
        return total_bytes, used_bytes, free_bytes

    @staticmethod
    def _calculate_disk_used_percent(total_bytes: int, used_bytes: int) -> float:
        disk_used_percent = (
            round((used_bytes / total_bytes) * 100, 1) if total_bytes > 0 else 0.0
        )
        return disk_used_percent

    @staticmethod
    def _resolve_threshold_status(disk_used_percent: float) -> str:
        if disk_used_percent >= STORAGE_CRITICAL_THRESHOLD_PERCENT:
            threshold_status = "CRITICAL"
        elif disk_used_percent >= STORAGE_WARNING_THRESHOLD_PERCENT:
            threshold_status = "WARNING"
        else:
            threshold_status = "NORMAL"
        return threshold_status

    def _measure_audio_cache(self) -> tuple[int, int]:
        if not self.audio_dir.exists():
            return 0, 0

        audio_cache_bytes = 0
        audio_cache_files = 0
        for entry in os.scandir(self.audio_dir):
            if entry.is_file() and entry.name.lower().endswith(".mp3"):
                audio_cache_files += 1
                try:
                    audio_cache_bytes += entry.stat().st_size
                except OSError as exc:
                    logger.warning(
                        "Could not read audio cache file size for %s: %s",
                        entry.path,
                        exc,
                    )
        return audio_cache_bytes, audio_cache_files

    def _measure_images(self) -> tuple[int, int]:
        if not self.image_dir.exists():
            return 0, 0

        image_bytes = 0
        image_files = 0
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        for entry in os.scandir(self.image_dir):
            if (
                entry.is_file()
                and Path(entry.name).suffix.lower() in allowed_extensions
            ):
                image_files += 1
                try:
                    image_bytes += entry.stat().st_size
                except OSError as exc:
                    logger.warning(
                        "Could not read image file size for %s: %s",
                        entry.path,
                        exc,
                    )
        return image_bytes, image_files

    def _sample_database_health(self) -> tuple[str, float]:
        try:
            db_latency_ms = self.audio_repository.ping_database()
            db_status = "connected"
        except Exception as exc:
            logger.warning("Database health ping failed: %s", exc)
            db_status = "error"
            db_latency_ms = -1.0
        return db_status, db_latency_ms

    def _collect_orphan_candidates(
        self,
        directory: Path,
        allowed_extensions: set[str],
        referenced_filenames: set[str],
    ) -> tuple[list[Path], int]:
        """Scan physical directory and collect unreferenced files matching allowed extensions."""
        orphan_candidates: list[Path] = []
        remaining_files = 0
        if not directory.is_dir():
            return orphan_candidates, remaining_files

        for entry in os.scandir(directory):
            if not entry.is_file():
                continue
            name = entry.name
            if name.startswith("."):
                continue
            ext = os.path.splitext(name)[1].lower()
            if ext not in allowed_extensions:
                continue
            if name in referenced_filenames:
                remaining_files += 1
            else:
                orphan_candidates.append(Path(entry.path))
        return orphan_candidates, remaining_files

    def _unlink_orphan_candidates(self, candidates: list[Path]) -> tuple[int, int]:
        """Unlink candidate files and measure deleted bytes."""
        deleted_count = 0
        reclaimed_bytes = 0
        for candidate in candidates:
            try:
                file_size = candidate.stat().st_size
                candidate.unlink()
                deleted_count += 1
                reclaimed_bytes += file_size
            except OSError as exc:
                logger.warning("Failed to delete orphan file %s: %s", candidate, exc)
        return deleted_count, reclaimed_bytes

    def prune_orphaned_audio_files(
        self,
        admin_username: str,
        client_ip: str | None = None,
    ) -> CleanOrphansData:
        """Scan physical audio & image caches, unlink unreferenced files, and record audit log."""
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.image_dir.mkdir(parents=True, exist_ok=True)

        # 1. Prune orphaned audio files (*.mp3)
        referenced_audio_urls = self.audio_repository.get_all_audio_urls()
        referenced_audio_names = {
            os.path.basename(url) for url in referenced_audio_urls if url
        }
        audio_candidates, remaining_audio = self._collect_orphan_candidates(
            directory=self.audio_dir,
            allowed_extensions={".mp3"},
            referenced_filenames=referenced_audio_names,
        )
        deleted_audio_count, reclaimed_audio_bytes = self._unlink_orphan_candidates(
            audio_candidates
        )

        # 2. Prune orphaned cover images (*.jpg, *.jpeg, *.png, *.webp)
        deleted_images_count = 0
        reclaimed_image_bytes = 0
        remaining_images = 0
        if self.poi_repository is not None:
            referenced_image_urls = self.poi_repository.get_all_image_urls()
            referenced_image_names = {
                os.path.basename(url) for url in referenced_image_urls if url
            }
            image_candidates, remaining_images = self._collect_orphan_candidates(
                directory=self.image_dir,
                allowed_extensions={".jpg", ".jpeg", ".png", ".webp"},
                referenced_filenames=referenced_image_names,
            )
            deleted_images_count, reclaimed_image_bytes = (
                self._unlink_orphan_candidates(image_candidates)
            )

        # Aggregated telemetry
        deleted_count = deleted_audio_count + deleted_images_count
        reclaimed_bytes = reclaimed_audio_bytes + reclaimed_image_bytes
        remaining_files = remaining_audio + remaining_images
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
            deleted_audio_count=deleted_audio_count,
            deleted_images_count=deleted_images_count,
            reclaimed_bytes=reclaimed_bytes,
            reclaimed_mb=reclaimed_mb,
            remaining_files=remaining_files,
            message=(
                f"Successfully cleaned {deleted_count} orphaned media files "
                f"({deleted_audio_count} audio, {deleted_images_count} images), "
                f"freeing {reclaimed_mb} MB."
            ),
        )

    # Alias for semantic clarity across media pruning
    prune_all_orphaned_media = prune_orphaned_audio_files
