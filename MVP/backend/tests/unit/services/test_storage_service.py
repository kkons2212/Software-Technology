"""Unit tests for StorageService (US 05.3 - TSK-05.3.1, TSK-05.3.3, TSK-05.3.5).

Verifies disk capacity threshold computation, audio cache telemetry,
database connection health checks, and safe orphan MP3 pruning.
"""

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.core.config import Settings
from app.repositories.audio_repository import AudioRepository
from app.repositories.audit_repository import AuditRepository
from app.services.storage_service import (
    StorageService,
)


@pytest.fixture
def mock_audio_repository() -> MagicMock:
    repo = MagicMock(spec=AudioRepository)
    repo.get_all_audio_urls.return_value = {
        "/static/audio/active_exhibit_1.mp3",
        "/static/audio/active_exhibit_2.mp3",
    }
    repo.ping_database.return_value = 1.45
    return repo


@pytest.fixture
def mock_audit_repository() -> MagicMock:
    repo = MagicMock(spec=AuditRepository)
    return repo


@pytest.fixture
def temp_audio_dir(tmp_path: Path) -> Path:
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    return audio_dir


@pytest.fixture
def storage_service(
    mock_audio_repository: MagicMock,
    mock_audit_repository: MagicMock,
    temp_audio_dir: Path,
) -> StorageService:
    settings = Settings(STATIC_DIR=str(temp_audio_dir.parent))
    return StorageService(
        audio_repository=mock_audio_repository,
        audit_repository=mock_audit_repository,
        audio_dir=temp_audio_dir,
        settings=settings,
    )


def test_should_classify_storage_as_normal_when_under_85_percent(
    storage_service: StorageService,
    temp_audio_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    # 70% disk usage: 700GB used out of 1000GB
    monkeypatch.setattr(
        "shutil.disk_usage",
        lambda _: (1000 * 1024**3, 700 * 1024**3, 300 * 1024**3),
    )

    result = storage_service.get_system_health()

    assert result.disk_used_percent == 70.0
    assert result.threshold_status == "NORMAL"
    assert result.storage.threshold_status == "NORMAL"
    assert result.status == "ok"
    assert result.db_status == "connected"
    assert result.db_latency_ms == 1.45
    assert result.external_services_ok is True


def test_should_classify_storage_as_warning_when_between_85_and_95_percent(
    storage_service: StorageService,
    temp_audio_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    # 88% disk usage
    monkeypatch.setattr(
        "shutil.disk_usage",
        lambda _: (1000 * 1024**3, 880 * 1024**3, 120 * 1024**3),
    )

    result = storage_service.get_system_health()

    assert result.disk_used_percent == 88.0
    assert result.threshold_status == "WARNING"
    assert result.storage.threshold_status == "WARNING"


def test_should_classify_storage_as_critical_when_at_or_above_95_percent(
    storage_service: StorageService,
    temp_audio_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    # 96.5% disk usage
    monkeypatch.setattr(
        "shutil.disk_usage",
        lambda _: (1000 * 1024**3, 965 * 1024**3, 35 * 1024**3),
    )

    result = storage_service.get_system_health()

    assert result.disk_used_percent == 96.5
    assert result.threshold_status == "CRITICAL"
    assert result.storage.threshold_status == "CRITICAL"


def test_should_calculate_audio_cache_bytes_and_file_count(
    storage_service: StorageService,
    temp_audio_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        "shutil.disk_usage",
        lambda _: (1000 * 1024**3, 500 * 1024**3, 500 * 1024**3),
    )

    # Populate cache directory with audio files and non-audio files
    f1 = temp_audio_dir / "sample1.mp3"
    f1.write_bytes(b"A" * 1024)  # 1 KB

    f2 = temp_audio_dir / "sample2.mp3"
    f2.write_bytes(b"B" * 2048)  # 2 KB

    txt = temp_audio_dir / "ignore.txt"
    txt.write_bytes(b"ignored")

    result = storage_service.get_system_health()

    assert result.audio_cache_files == 2
    assert result.audio_cache_bytes == 3072


def test_should_handle_db_ping_failure_gracefully(
    storage_service: StorageService,
    mock_audio_repository: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        "shutil.disk_usage",
        lambda _: (1000 * 1024**3, 500 * 1024**3, 500 * 1024**3),
    )
    mock_audio_repository.ping_database.side_effect = RuntimeError("Connection timeout")

    result = storage_service.get_system_health()

    assert result.status == "degraded"
    assert result.db_status == "error"
    assert result.db_latency_ms == -1.0


def test_should_prune_unreferenced_audio_files_and_preserve_active_files(
    storage_service: StorageService,
    temp_audio_dir: Path,
    mock_audit_repository: MagicMock,
):
    # Active files referenced in mock_audio_repository
    active1 = temp_audio_dir / "active_exhibit_1.mp3"
    active1.write_bytes(b"1" * 1024 * 500)  # 500 KB

    active2 = temp_audio_dir / "active_exhibit_2.mp3"
    active2.write_bytes(b"2" * 1024 * 700)  # 700 KB

    # Orphaned files (not in mock_audio_repository)
    orphan1 = temp_audio_dir / "old_orphaned_audio_1.mp3"
    orphan1.write_bytes(b"O" * 1024 * 1024 * 2)  # 2 MB

    orphan2 = temp_audio_dir / "old_orphaned_audio_2.mp3"
    orphan2.write_bytes(b"O" * 1024 * 1024 * 3)  # 3 MB

    # Temporary dotfile (must NOT be pruned)
    tmp_file = temp_audio_dir / ".generating_preview.mp3"
    tmp_file.write_bytes(b"TMP")

    # Non-mp3 file (must NOT be touched)
    other_file = temp_audio_dir / "readme.txt"
    other_file.write_bytes(b"README")

    response = storage_service.prune_orphaned_audio_files(
        admin_username="test_admin",
        client_ip="192.168.1.50",
    )

    # Assertions on return payload
    assert response.deleted_count == 2
    assert response.reclaimed_bytes == (1024 * 1024 * 5)
    assert response.reclaimed_mb == 5.0
    assert response.remaining_files == 2
    assert set(response.model_dump()) == {
        "deleted_count",
        "reclaimed_bytes",
        "reclaimed_mb",
        "remaining_files",
        "message",
    }

    # Verify physical file existence
    assert not orphan1.exists()
    assert not orphan2.exists()
    assert active1.exists()
    assert active2.exists()
    assert tmp_file.exists()
    assert other_file.exists()

    # Verify audit log was recorded
    mock_audit_repository.log_action.assert_called_once_with(
        username="test_admin",
        status="SUCCESS",
        ip_address="192.168.1.50",
        details="CLEAN_ORPHANS_2_FILES_5.0_MB",
    )


def test_should_continue_pruning_when_an_orphan_file_cannot_be_deleted(
    storage_service: StorageService,
    temp_audio_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    failed_orphan = temp_audio_dir / "failed_orphan.mp3"
    failed_orphan.write_bytes(b"failed")
    deleted_orphan = temp_audio_dir / "deleted_orphan.mp3"
    deleted_orphan.write_bytes(b"deleted")
    original_unlink = Path.unlink

    def unlink_with_failure(path: Path, *args, **kwargs):
        if path == failed_orphan:
            raise OSError("permission denied")
        return original_unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", unlink_with_failure)

    response = storage_service.prune_orphaned_audio_files(admin_username="test_admin")

    assert response.deleted_count == 1
    assert response.reclaimed_bytes == len(b"deleted")
    assert response.remaining_files == 0
    assert failed_orphan.exists()
    assert not deleted_orphan.exists()
