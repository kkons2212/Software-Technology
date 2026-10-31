"""Unit tests for ExportService (US 05.4 - TSK-05.4.1 & TSK-05.4.3)."""

import json
from datetime import date, datetime, timezone
from unittest.mock import MagicMock

import pytest

from app.services.export_service import ExportService


@pytest.fixture
def mock_telemetry_repo():
    return MagicMock()


@pytest.fixture
def export_service(mock_telemetry_repo):
    return ExportService(telemetry_repo=mock_telemetry_repo)


def test_resolve_date_bounds_presets(export_service, mocker):
    frozen_now = datetime(2026, 10, 27, 6, 30, tzinfo=timezone.utc)
    mocker.patch(
        "app.services.export_service._current_utc_time", return_value=frozen_now
    )

    # TODAY
    start_today, end_today = export_service.resolve_date_bounds(time_range="TODAY")
    assert start_today == datetime(2026, 10, 26, 17, 0)
    assert end_today is None

    # LAST_7_DAYS
    start_7d, end_7d = export_service.resolve_date_bounds(time_range="LAST_7_DAYS")
    assert start_7d == datetime(2026, 10, 20, 6, 30)
    assert end_7d is None
    assert start_7d < start_today

    # LAST_30_DAYS
    start_30d, end_30d = export_service.resolve_date_bounds(time_range="LAST_30_DAYS")
    assert start_30d == datetime(2026, 9, 27, 6, 30)
    assert end_30d is None
    assert start_30d < start_7d


def test_resolve_date_bounds_custom_range(export_service):
    start_d = date(2026, 10, 1)
    end_d = date(2026, 10, 15)
    start_dt, end_dt = export_service.resolve_date_bounds(
        start_date=start_d, end_date=end_d
    )
    assert isinstance(start_dt, datetime)
    assert isinstance(end_dt, datetime)
    assert start_dt < end_dt


def test_resolve_date_bounds_validation_errors(export_service):
    # Unknown preset
    with pytest.raises(ValueError, match="Unsupported analytics time range"):
        export_service.resolve_date_bounds(time_range="UNKNOWN_RANGE")

    # Start date without end date
    with pytest.raises(ValueError, match="Both start_date and end_date are required"):
        export_service.resolve_date_bounds(start_date=date(2026, 10, 1))

    # End date without start date
    with pytest.raises(ValueError, match="Both start_date and end_date are required"):
        export_service.resolve_date_bounds(end_date=date(2026, 10, 1))

    # start_date > end_date
    with pytest.raises(ValueError, match="start_date cannot be after end_date"):
        export_service.resolve_date_bounds(
            start_date=date(2026, 10, 15), end_date=date(2026, 10, 1)
        )


def test_stream_csv_with_records(export_service, mock_telemetry_repo):
    mock_telemetry_repo.query_export_telemetry.return_value = [
        ("2026-10-29", "Địa đạo Bến Dược, Khu A", 18, "vi", 85.5),
        ("2026-10-29", "Bunker Section 2", 9, "en", 45.0),
    ]

    generator = export_service.stream_csv(datetime(2026, 10, 29, tzinfo=timezone.utc))
    chunks = list(generator)

    # 1. First chunk must be UTF-8 BOM
    assert chunks[0] == "\ufeff"

    # 2. Reconstruct full CSV text
    full_csv = "".join(chunks)
    assert (
        "Date,Exhibit Name,Trigger Count,Language,Average Dwell Duration (seconds)"
        in full_csv
    )
    assert '"Địa đạo Bến Dược, Khu A",18,vi,85.5' in full_csv
    assert "Bunker Section 2,9,en,45.0" in full_csv


def test_stream_csv_empty_records(export_service, mock_telemetry_repo):
    mock_telemetry_repo.query_export_telemetry.return_value = []

    generator = export_service.stream_csv(datetime(2026, 10, 29, tzinfo=timezone.utc))
    chunks = list(generator)

    assert chunks[0] == "\ufeff"
    full_csv = "".join(chunks)
    lines = full_csv.strip().splitlines()
    assert len(lines) == 1  # Only header line
    assert "Date,Exhibit Name" in lines[0]


def test_stream_json_with_records(export_service, mock_telemetry_repo):
    mock_telemetry_repo.query_export_telemetry.return_value = [
        ("2026-10-29", "Địa đạo Bến Dược", 18, "vi", 85.5),
        ("2026-10-29", "Bunker Section 2", 9, "en", 45.0),
    ]

    generator = export_service.stream_json(datetime(2026, 10, 29, tzinfo=timezone.utc))
    full_json = "".join(generator)

    # Validate parseable JSON
    data = json.loads(full_json)
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0] == {
        "date": "2026-10-29",
        "exhibit_name": "Địa đạo Bến Dược",
        "trigger_count": 18,
        "language": "vi",
        "average_dwell_duration": 85.5,
    }
    assert data[1] == {
        "date": "2026-10-29",
        "exhibit_name": "Bunker Section 2",
        "trigger_count": 9,
        "language": "en",
        "average_dwell_duration": 45.0,
    }


def test_stream_json_empty_records(export_service, mock_telemetry_repo):
    mock_telemetry_repo.query_export_telemetry.return_value = []

    generator = export_service.stream_json(datetime(2026, 10, 29, tzinfo=timezone.utc))
    full_json = "".join(generator)

    data = json.loads(full_json)
    assert data == []
