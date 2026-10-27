"""Paired unit tests for `app.controllers.analytics_controller` (US 05.2).

Exercised through a real `TestClient` so the suite covers the HTTP contract the
Admin Portal consumes: cookie-based admin authentication, the standardized error
envelope, range validation, and the aggregated payload shape.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.poi import POI
from app.models.session import VisitorSession
from app.models.trigger import POITrigger
from app.models.user import User

ANALYTICS_ROUTE = "/api/v1/admin/analytics/summary"
LOGIN_ROUTE = "/api/v1/auth/login"

ADMIN_USER_NAME = "admin"
ADMIN_EMAIL = "admin@cuchi.vn"
ADMIN_PASSWORD = "Admin@12345"

FROZEN_NOW = datetime(2026, 10, 27, 6, 30, tzinfo=timezone.utc)


@pytest.fixture()
def seeded_admin(db_session: Session) -> User:
    administrator = User(
        user_name=ADMIN_USER_NAME,
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name="System Administrator",
        is_active=True,
        falsed_attempts=0,
    )
    db_session.add(administrator)
    db_session.commit()
    return administrator


@pytest.fixture()
def authenticated_client(client, seeded_admin):
    """Sign in so the HttpOnly admin session cookie is present on later calls."""
    login_response = client.post(
        LOGIN_ROUTE, json={"username": ADMIN_USER_NAME, "password": ADMIN_PASSWORD}
    )
    assert login_response.status_code == 200
    return client


@pytest.fixture()
def frozen_clock(mocker):
    """Freeze the aggregation clock so window maths is reproducible in CI."""
    return mocker.patch(
        "app.services.telemetry_service._current_utc_time", return_value=FROZEN_NOW
    )


def seed_analytics_fixture(db_session: Session) -> None:
    """Seed one exhibit, one Japanese visitor session and one 600s trigger."""
    db_session.add(
        POI(
            PoiID="poi_an_001",
            Title="Ben Duoc Tunnels",
            Short_Description="Revolutionary tunnel complex",
            Latitude=11.1432,
            Longitude=106.4631,
            Radius=30,
            Is_Active=True,
        )
    )
    db_session.add(
        VisitorSession(
            SessionID="sess_an_001",
            SessionCode="ANALYTICS01",
            SessionToken="token_analytics_001",
            Status="ACTIVE",
            PreferredLanguage="ja",
            Create_at=FROZEN_NOW - timedelta(days=1),
        )
    )
    db_session.add(
        POITrigger(
            TriggerID="trg_an_001",
            SessionID="sess_an_001",
            PoiID="poi_an_001",
            DwellTime=600,
            Trigger_at=FROZEN_NOW - timedelta(hours=1),
        )
    )
    db_session.commit()


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_default_to_the_last_seven_days_when_range_is_omitted(
    authenticated_client, frozen_clock
):
    response = authenticated_client.get(ANALYTICS_ROUTE)

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["time_range"] == "LAST_7_DAYS"
    assert payload["kpis"] == {
        "total_visitors": 0,
        "total_audio_plays": 0,
        "top_exhibit_title": None,
        "average_tour_duration_minutes": 0.0,
    }
    assert payload["top_pois"] == []
    assert payload["language_distribution"] == []


def test_should_aggregate_seeded_telemetry_into_the_payload(
    authenticated_client, db_session, frozen_clock
):
    seed_analytics_fixture(db_session)

    response = authenticated_client.get(f"{ANALYTICS_ROUTE}?range=LAST_7_DAYS")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["kpis"]["total_visitors"] == 1
    assert payload["kpis"]["total_audio_plays"] == 1
    assert payload["kpis"]["top_exhibit_title"] == "Ben Duoc Tunnels"
    assert payload["kpis"]["average_tour_duration_minutes"] == 10.0
    assert payload["top_pois"] == [
        {"poi_id": "poi_an_001", "poi_title": "Ben Duoc Tunnels", "trigger_count": 1}
    ]
    assert payload["language_distribution"] == [
        {
            "language_id": "ja",
            "language_name": "Japanese",
            "visitor_count": 1,
            "percentage": 100.0,
        }
    ]


@pytest.mark.parametrize("requested_range", ["TODAY", "LAST_30_DAYS"])
def test_should_echo_the_requested_time_range(
    authenticated_client, frozen_clock, requested_range
):
    response = authenticated_client.get(f"{ANALYTICS_ROUTE}?range={requested_range}")

    assert response.status_code == 200
    assert response.json()["data"]["time_range"] == requested_range


# ---------------------------------------------------------------------------
# SECURITY / ERROR PATHS
# ---------------------------------------------------------------------------
def test_should_return_401_envelope_when_admin_cookie_is_absent(client, frozen_clock):
    response = client.get(ANALYTICS_ROUTE)

    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"]


def test_should_return_422_envelope_for_an_unsupported_time_range(
    authenticated_client, frozen_clock
):
    response = authenticated_client.get(f"{ANALYTICS_ROUTE}?range=LAST_QUARTER")

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "REQUEST_VALIDATION_ERROR"
