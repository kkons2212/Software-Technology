"""Paired unit tests for `app.controllers.admin_poi_controller` (US 03.2).

Exercised through a real `TestClient` with the JIT `get_db` dependency
overridden by the rollback-isolated MySQL `db_session` fixture. Every assertion
therefore covers the HTTP contract of the shared admin write endpoint:
authentication, the standardized error envelope and the success payload that the
Admin Portal consumes.
"""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.audit import Audit
from app.models.poi import POI
from app.models.user import User
from app.services.poi_service import POI_GEOFENCE_UPDATED_DETAILS

UPDATE_ROUTE_TEMPLATE = "/api/v1/admin/pois/{poi_id}"
LOGIN_ROUTE = "/api/v1/auth/login"

ADMIN_USER_NAME = "admin"
ADMIN_EMAIL = "admin@cuchi.vn"
ADMIN_PASSWORD = "Admin@12345"

EXISTING_POI_ID = "poi-1"
EXISTING_LATITUDE = 11.1445
EXISTING_LONGITUDE = 106.4645
EXISTING_RADIUS = 30

OUT_OF_BOUNDS_LATITUDE = 95.0
OUT_OF_BOUNDS_LONGITUDE = 195.0

# `TestClient` does not populate `request.client`, so the originating address is
# supplied the same way the reverse proxy does in production. This also proves
# the controller plumbs `resolve_client_ip` into the service.
FORWARDED_CLIENT_IP = "198.51.100.23"
X_FORWARDED_FOR_HEADER = {"x-forwarded-for": FORWARDED_CLIENT_IP}


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
def seeded_poi(db_session: Session) -> POI:
    poi = POI(
        poi_id=EXISTING_POI_ID,
        title="Tunnel entrance",
        short_description="A narrow entry",
        image_url="https://example.test/poi.jpg",
        latitude=Decimal(str(EXISTING_LATITUDE)),
        longitude=Decimal(str(EXISTING_LONGITUDE)),
        radius=EXISTING_RADIUS,
        is_active=True,
    )
    db_session.add(poi)
    db_session.commit()
    return poi


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def authenticated_client(client: TestClient, seeded_admin) -> TestClient:
    """Sign in so the HttpOnly session cookie is present on every later call."""
    login_response = client.post(
        LOGIN_ROUTE, json={"username": ADMIN_USER_NAME, "password": ADMIN_PASSWORD}
    )
    assert login_response.status_code == 200
    return client


def _update_route(poi_id: str = EXISTING_POI_ID) -> str:
    return UPDATE_ROUTE_TEMPLATE.format(poi_id=poi_id)


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_update_geofence_and_return_the_exhibit_payload(
    authenticated_client, seeded_poi, db_session
):
    response = authenticated_client.put(
        _update_route(),
        json={"latitude": 11.1450, "longitude": 106.4620, "radius": 45},
        headers=X_FORWARDED_FOR_HEADER,
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {
            "id": EXISTING_POI_ID,
            "title": "Tunnel entrance",
            "short_description": "A narrow entry",
            "image_url": "https://example.test/poi.jpg",
            "latitude": 11.1450,
            "longitude": 106.4620,
            "trigger_radius": 45,
        },
    }
    assert seeded_poi.radius == 45

    # The sign-in itself also writes a SUCCESS row, so the geofence audit entry
    # is identified by its own action marker.
    audit_row = (
        db_session.query(Audit)
        .filter(Audit.details == POI_GEOFENCE_UPDATED_DETAILS)
        .one()
    )
    assert audit_row.user_name == ADMIN_USER_NAME
    assert audit_row.ip_address == FORWARDED_CLIENT_IP


def test_should_accept_a_radius_only_update(authenticated_client, seeded_poi):
    response = authenticated_client.put(_update_route(), json={"radius": 15})

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["trigger_radius"] == 15
    # Coordinates were omitted and must keep their stored values.
    assert payload["latitude"] == EXISTING_LATITUDE
    assert payload["longitude"] == EXISTING_LONGITUDE


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(11.136361, 106.455139), (11.149306, 106.467639)],
)
def test_should_accept_coordinates_exactly_on_the_perimeter(
    authenticated_client, seeded_poi, latitude, longitude
):
    response = authenticated_client.put(
        _update_route(), json={"latitude": latitude, "longitude": longitude}
    )

    assert response.status_code == 200
    assert response.json()["data"]["latitude"] == latitude


@pytest.mark.parametrize("radius", [10, 50])
def test_should_accept_radius_at_the_slider_limits(
    authenticated_client, seeded_poi, radius
):
    response = authenticated_client.put(_update_route(), json={"radius": radius})

    assert response.status_code == 200
    assert response.json()["data"]["trigger_radius"] == radius


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_return_401_envelope_when_session_cookie_absent(client, seeded_poi):
    response = client.put(_update_route(), json={"radius": 40})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_should_return_400_envelope_when_coordinates_leave_the_perimeter(
    authenticated_client, seeded_poi, db_session
):
    response = authenticated_client.put(
        _update_route(),
        json={"latitude": OUT_OF_BOUNDS_LATITUDE, "longitude": OUT_OF_BOUNDS_LONGITUDE},
    )

    assert response.status_code == 400
    assert response.json() == {
        "success": False,
        "error": {
            "code": "GEO_OUT_OF_BOUNDS",
            "message": "Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).",
            "details": None,
        },
    }
    assert seeded_poi.radius == EXISTING_RADIUS
    # Only the sign-in audit row exists; the rejected write is not audited.
    geofence_audits = (
        db_session.query(Audit)
        .filter(Audit.details == POI_GEOFENCE_UPDATED_DETAILS)
        .count()
    )
    assert geofence_audits == 0


def test_should_return_404_envelope_when_the_exhibit_does_not_exist(
    authenticated_client,
):
    response = authenticated_client.put(
        _update_route("poi-missing"), json={"radius": 40}
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "POI_NOT_FOUND"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"radius": 9},
        {"radius": 51},
        {"latitude": 90.1},
    ],
)
def test_should_return_422_envelope_when_the_payload_is_invalid(
    authenticated_client, seeded_poi, payload
):
    response = authenticated_client.put(_update_route(), json=payload)

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "REQUEST_VALIDATION_ERROR"


def test_should_reject_a_cross_site_write_without_the_session_cookie(
    client, seeded_poi
):
    # A tampered cookie must be indistinguishable from a missing session.
    client.cookies.set(get_settings().ADMIN_SESSION_COOKIE_NAME, "tampered.jwt.value")

    response = client.put(_update_route(), json={"radius": 40})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


# ==============================================================================
# US 03.3: PATCH /api/v1/admin/pois/{poi_id}/visibility Controller Tests
# ==============================================================================


def test_should_toggle_poi_visibility_when_authenticated(
    authenticated_client, seeded_poi, db_session
):
    """PATCH visibility to False deactivates POI and returns updated profile."""
    url = f"/api/v1/admin/pois/{seeded_poi.poi_id}/visibility"
    response = authenticated_client.patch(
        url,
        json={"is_active": False},
        headers=X_FORWARDED_FOR_HEADER,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["poi_id"] == seeded_poi.poi_id
    assert body["is_active"] is False

    db_session.refresh(seeded_poi)
    assert seeded_poi.is_active is False


def test_should_reactivate_poi_visibility(authenticated_client, seeded_poi, db_session):
    """PATCH visibility to True reactivates POI."""
    seeded_poi.is_active = False
    db_session.commit()

    url = f"/api/v1/admin/pois/{seeded_poi.poi_id}/visibility"
    response = authenticated_client.patch(
        url,
        json={"is_active": True},
        headers=X_FORWARDED_FOR_HEADER,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_active"] is True

    db_session.refresh(seeded_poi)
    assert seeded_poi.is_active is True


def test_should_return_404_when_toggling_visibility_for_nonexistent_poi(
    authenticated_client,
):
    """PATCH visibility for missing POI returns 404 envelope."""
    url = "/api/v1/admin/pois/nonexistent-poi-id/visibility"
    response = authenticated_client.patch(
        url,
        json={"is_active": False},
    )

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "POI_NOT_FOUND"


def test_should_reject_visibility_toggle_without_admin_session(client, seeded_poi):
    """Unauthenticated request to PATCH visibility is rejected with 401."""
    url = f"/api/v1/admin/pois/{seeded_poi.poi_id}/visibility"
    response = client.patch(url, json={"is_active": False})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
