"""Unit tests for TelemetryService ingestion (US 01.3) and analytics (US 05.2).

TSK-05.2.1 / TSK-05.2.3: paired suite for `app/services/telemetry_service.py`.
The aggregation clock is injected via `_current_utc_time` so every expectation is
deterministic instead of depending on the wall clock.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.poi import POI
from app.models.session import VisitorSession
from app.models.trigger import POITrigger
from app.repositories.telemetry_repository import TelemetryRepository
from app.schemas.telemetry_schema import TelemetryTriggerCreate
from app.services.telemetry_service import TelemetryService

FROZEN_NOW = datetime(2026, 10, 27, 6, 30, tzinfo=timezone.utc)
LAST_7_DAYS_START = FROZEN_NOW - timedelta(days=7)
# Cu Chi runs on UTC+7, so "today" locally spans 2026-10-26T17:00Z .. 2026-10-27T17:00Z.
TODAY_LOCAL_MIDNIGHT_UTC = datetime(2026, 10, 26, 17, 0)
TOP_POI_LIMIT = 10


@pytest.fixture()
def frozen_clock(mocker):
    """Freeze the analytics clock so window maths is reproducible in CI."""
    return mocker.patch(
        "app.services.telemetry_service._current_utc_time", return_value=FROZEN_NOW
    )


def build_service(db_session) -> TelemetryService:
    return TelemetryService(telemetry_repo=TelemetryRepository(db_session))


def seed_poi(db_session, poi_id: str, title: str) -> POI:
    poi = POI(
        PoiID=poi_id,
        Title=title,
        Short_Description="Underground exhibit",
        Latitude=11.1432,
        Longitude=106.4631,
        Radius=30,
        Is_Active=True,
    )
    db_session.add(poi)
    db_session.commit()
    return poi


def seed_session(
    db_session, session_id: str, language: str, created_at: datetime
) -> VisitorSession:
    session = VisitorSession(
        SessionID=session_id,
        SessionCode=f"CODE_{session_id}",
        SessionToken=f"token_{session_id}",
        Status="ACTIVE",
        PreferredLanguage=language,
        Create_at=created_at,
    )
    db_session.add(session)
    db_session.commit()
    return session


def seed_trigger(
    db_session,
    trigger_id: str,
    session_id: str,
    poi_id: str,
    dwell_time: int,
    trigger_at: datetime,
) -> POITrigger:
    trigger = POITrigger(
        TriggerID=trigger_id,
        SessionID=session_id,
        PoiID=poi_id,
        DwellTime=dwell_time,
        Trigger_at=trigger_at,
    )
    db_session.add(trigger)
    db_session.commit()
    return trigger


# ---------------------------------------------------------------------------
# ingest_trigger
# ---------------------------------------------------------------------------


def test_should_capture_payload_language_on_new_guest_session(db_session):
    seed_poi(db_session, "poi_lang", "Alpha Exhibit")
    service = build_service(db_session)

    response = service.ingest_trigger(
        TelemetryTriggerCreate(PoiID="poi_lang", DwellTime=42, PreferredLanguage="ja")
    )

    assert response.poi_id == "poi_lang"
    assert response.dwell_time == 42
    created_session = (
        db_session.query(VisitorSession)
        .filter(VisitorSession.SessionID == response.session_id)
        .one()
    )
    assert created_session.PreferredLanguage == "ja"


def test_should_default_guest_session_language_to_vietnamese_when_omitted(db_session):
    seed_poi(db_session, "poi_default", "Beta Exhibit")
    service = build_service(db_session)

    response = service.ingest_trigger(TelemetryTriggerCreate(PoiID="poi_default"))

    created_session = (
        db_session.query(VisitorSession)
        .filter(VisitorSession.SessionID == response.session_id)
        .one()
    )
    assert created_session.PreferredLanguage == "vi"


def test_should_not_overwrite_language_of_existing_session(db_session):
    seed_poi(db_session, "poi_existing", "Gamma Exhibit")
    seed_session(db_session, "sess_existing", "en", FROZEN_NOW)
    service = build_service(db_session)

    service.ingest_trigger(
        TelemetryTriggerCreate(
            SessionID="sess_existing", PoiID="poi_existing", PreferredLanguage="ja"
        )
    )

    stored_session = (
        db_session.query(VisitorSession)
        .filter(VisitorSession.SessionID == "sess_existing")
        .one()
    )
    assert stored_session.PreferredLanguage == "en"


def test_should_raise_when_ingesting_trigger_for_missing_poi(db_session):
    service = build_service(db_session)

    with pytest.raises(ValueError, match="does not exist"):
        service.ingest_trigger(TelemetryTriggerCreate(PoiID="poi_absent"))


# ---------------------------------------------------------------------------
# get_analytics_summary
# ---------------------------------------------------------------------------


def test_should_aggregate_kpis_rankings_and_language_demographics(
    db_session, frozen_clock
):
    seed_poi(db_session, "poi_a", "Alpha Exhibit")
    seed_poi(db_session, "poi_b", "Beta Exhibit")
    seed_poi(db_session, "poi_c", "Gamma Exhibit")
    seed_session(db_session, "sess_a", "vi", FROZEN_NOW - timedelta(days=1))
    seed_session(db_session, "sess_b", "ja", FROZEN_NOW - timedelta(days=1))
    seed_session(db_session, "sess_c", "en", FROZEN_NOW - timedelta(days=1))

    base = FROZEN_NOW - timedelta(hours=12)
    seed_trigger(db_session, "trg_001", "sess_a", "poi_a", 600, base)
    seed_trigger(
        db_session, "trg_002", "sess_a", "poi_b", 600, base + timedelta(minutes=20)
    )
    seed_trigger(
        db_session, "trg_003", "sess_b", "poi_a", 300, base + timedelta(hours=1)
    )
    seed_trigger(
        db_session, "trg_004", "sess_c", "poi_a", 300, base + timedelta(hours=2)
    )

    summary = build_service(db_session).get_analytics_summary("LAST_7_DAYS")

    assert summary.time_range == "LAST_7_DAYS"
    assert summary.kpis.total_visitors == 3
    assert summary.kpis.total_audio_plays == 4
    assert summary.kpis.top_exhibit_title == "Alpha Exhibit"
    # Per-session totals are 1200s, 300s and 300s -> mean 600s -> 10 minutes.
    assert summary.kpis.average_tour_duration_minutes == 10.0

    assert [(row.poi_id, row.trigger_count) for row in summary.top_pois] == [
        ("poi_a", 3),
        ("poi_b", 1),
    ]

    distribution = {
        row.language_id: row.percentage for row in summary.language_distribution
    }
    assert distribution == {"vi": 33.33, "ja": 33.33, "en": 33.33}


def test_should_return_zeroed_summary_when_window_holds_no_records(
    db_session, frozen_clock
):
    summary = build_service(db_session).get_analytics_summary("LAST_7_DAYS")

    assert summary.kpis.total_visitors == 0
    assert summary.kpis.total_audio_plays == 0
    assert summary.kpis.top_exhibit_title is None
    assert summary.kpis.average_tour_duration_minutes == 0.0
    assert summary.top_pois == []
    assert summary.language_distribution == []


def test_should_cap_top_poi_ranking_at_ten_entries(db_session, frozen_clock):
    seed_session(db_session, "sess_top", "vi", FROZEN_NOW - timedelta(days=1))
    for index in range(TOP_POI_LIMIT + 1):
        poi_id = f"poi_top_{index:02d}"
        seed_poi(db_session, poi_id, f"Exhibit {index:02d}")
        seed_trigger(
            db_session,
            f"trg_top_{index:02d}",
            "sess_top",
            poi_id,
            60,
            FROZEN_NOW - timedelta(hours=5),
        )

    summary = build_service(db_session).get_analytics_summary("LAST_7_DAYS")

    # Equal trigger volumes fall back to the title tiebreaker, so the 11th exhibit
    # is the one dropped by the TOP_POI_LIMIT cap.
    assert len(summary.top_pois) == TOP_POI_LIMIT
    assert [row.poi_id for row in summary.top_pois] == [
        f"poi_top_{index:02d}" for index in range(TOP_POI_LIMIT)
    ]
    assert summary.kpis.top_exhibit_title == "Exhibit 00"


def test_should_include_trigger_recorded_exactly_at_window_start(
    db_session, frozen_clock
):
    seed_poi(db_session, "poi_edge", "Edge Exhibit")
    seed_session(db_session, "sess_edge", "vi", LAST_7_DAYS_START)
    seed_trigger(
        db_session, "trg_edge", "sess_edge", "poi_edge", 120, LAST_7_DAYS_START
    )

    summary = build_service(db_session).get_analytics_summary("LAST_7_DAYS")

    assert summary.kpis.total_visitors == 1
    assert summary.kpis.total_audio_plays == 1


def test_should_close_today_window_on_local_midnight_not_utc_midnight(
    db_session, frozen_clock
):
    seed_poi(db_session, "poi_today", "Today Exhibit")
    # 2026-10-26T16:30Z is 23:30 local on the previous day -> outside TODAY.
    seed_session(
        db_session, "sess_prev", "vi", TODAY_LOCAL_MIDNIGHT_UTC - timedelta(minutes=30)
    )
    # 2026-10-26T17:00Z is 00:00 local today -> the inclusive first second of TODAY.
    seed_session(db_session, "sess_today", "ja", TODAY_LOCAL_MIDNIGHT_UTC)
    seed_trigger(
        db_session,
        "trg_prev",
        "sess_prev",
        "poi_today",
        90,
        TODAY_LOCAL_MIDNIGHT_UTC - timedelta(minutes=30),
    )
    seed_trigger(
        db_session, "trg_today", "sess_today", "poi_today", 90, TODAY_LOCAL_MIDNIGHT_UTC
    )

    summary = build_service(db_session).get_analytics_summary("TODAY")

    assert summary.kpis.total_visitors == 1
    assert summary.kpis.total_audio_plays == 1


def test_should_reject_unknown_time_range(db_session):
    service = build_service(db_session)

    with pytest.raises(ValueError, match="Unsupported analytics time range"):
        service.get_analytics_summary("LAST_QUARTER")


# ---------------------------------------------------------------------------
# US 05.1: Real-Time Visitor Density Heatmap Service Tests
# ---------------------------------------------------------------------------
def test_should_return_empty_heatmap_data_when_no_records_exist(
    db_session, frozen_clock
):
    service = build_service(db_session)
    heatmap = service.get_heatmap_data("LAST_7_DAYS")

    assert heatmap.time_range == "LAST_7_DAYS"
    assert heatmap.total_points == 0
    assert heatmap.max_trigger_count == 0
    assert heatmap.points == []


def test_should_build_empty_heatmap_with_stable_response_fields(frozen_clock):
    telemetry_repo = MagicMock(spec=TelemetryRepository)
    telemetry_repo.list_heatmap_poi_triggers.return_value = []
    service = TelemetryService(telemetry_repo=telemetry_repo)

    heatmap = service.get_heatmap_data("LAST_7_DAYS")

    assert heatmap.model_dump() == {
        "time_range": "LAST_7_DAYS",
        "generated_at": FROZEN_NOW,
        "points": [],
        "total_points": 0,
        "max_trigger_count": 0,
    }


def test_should_normalize_mocked_heatmap_rows_without_database(frozen_clock):
    telemetry_repo = MagicMock(spec=TelemetryRepository)
    telemetry_repo.list_heatmap_poi_triggers.return_value = [
        ("poi_high", "High Activity", 11.1432, 106.4631, 4),
        ("poi_low", "Low Activity", 11.1433, 106.4632, 1),
        ("poi_none", "No Activity", 11.1434, 106.4633, 0),
    ]
    service = TelemetryService(telemetry_repo=telemetry_repo)

    heatmap = service.get_heatmap_data("LAST_7_DAYS")

    assert [
        (point.poi_id, point.trigger_count, point.intensity) for point in heatmap.points
    ] == [
        ("poi_high", 4, 1.0),
        ("poi_low", 1, 0.25),
        ("poi_none", 0, 0.0),
    ]
    assert heatmap.total_points == 3
    assert heatmap.max_trigger_count == 4
    telemetry_repo.list_heatmap_poi_triggers.assert_called_once_with(
        LAST_7_DAYS_START.replace(tzinfo=None)
    )


def test_should_aggregate_heatmap_points_and_calculate_normalized_intensity(
    db_session, frozen_clock
):
    service = build_service(db_session)
    # Seed 2 POIs with coordinates
    seed_poi(db_session, "poi_heat_1", "Commanding Bunker")
    seed_poi(db_session, "poi_heat_2", "Fighting Bunker")
    seed_session(db_session, "sess_heat", "vi", FROZEN_NOW - timedelta(days=1))

    # Seed 3 triggers for poi_heat_1 and 1 trigger for poi_heat_2
    for idx in range(3):
        seed_trigger(
            db_session,
            f"trg_heat_1_{idx}",
            "sess_heat",
            "poi_heat_1",
            100,
            FROZEN_NOW - timedelta(hours=2),
        )
    seed_trigger(
        db_session,
        "trg_heat_2_0",
        "sess_heat",
        "poi_heat_2",
        50,
        FROZEN_NOW - timedelta(hours=2),
    )

    heatmap = service.get_heatmap_data("LAST_7_DAYS")

    assert heatmap.total_points == 2
    assert heatmap.max_trigger_count == 3

    p1 = next(p for p in heatmap.points if p.poi_id == "poi_heat_1")
    assert p1.poi_title == "Commanding Bunker"
    assert p1.trigger_count == 3
    assert p1.intensity == 1.0
    assert p1.lat == 11.1432
    assert p1.lng == 106.4631

    p2 = next(p for p in heatmap.points if p.poi_id == "poi_heat_2")
    assert p2.poi_title == "Fighting Bunker"
    assert p2.trigger_count == 1
    assert p2.intensity == round(1 / 3, 3)


def test_should_reject_unknown_time_range_in_get_heatmap_data(db_session):
    service = build_service(db_session)

    with pytest.raises(ValueError, match="Unsupported analytics time range"):
        service.get_heatmap_data("INVALID_RANGE")
