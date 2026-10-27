"""Paired unit tests for `app.services.poi_service` (US 03.2 - TSK-03.2.1).

The Cu Chi bounding-box validator and the audited geofence write are exercised
through the real repositories against the rollback-isolated MySQL session, so
every assertion also proves that the persistence path (Decimal coordinates,
radius column, `Audit` row) behaves as specified.
"""

from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError
from app.models.audit import AUDIT_STATUS_SUCCESS, Audit
from app.models.poi import POI
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import POIUpdateRequest
from app.services.poi_service import (
    GEO_OUT_OF_BOUNDS_ERROR_CODE,
    POI_GEOFENCE_UPDATED_DETAILS,
    POI_NOT_FOUND_ERROR_CODE,
    POIService,
)

ADMIN_USER_NAME = "admin"
ADMIN_EMAIL = "admin@cuchi.vn"
CLIENT_IP = "203.0.113.7"

EXISTING_POI_ID = "poi-1"
EXISTING_LATITUDE = 11.1445
EXISTING_LONGITUDE = 106.4645
EXISTING_RADIUS = 30

# Cu Chi Tunnels perimeter (dev_rules / ui_rules Section 3.2).
MIN_LATITUDE = 11.135
MAX_LATITUDE = 11.155
MIN_LONGITUDE = 106.45
MAX_LONGITUDE = 106.475


@pytest.fixture()
def seeded_admin(db_session: Session) -> User:
    """Seed the administrator whose name must satisfy the `Audit` FK."""
    administrator = User(
        user_name=ADMIN_USER_NAME,
        email=ADMIN_EMAIL,
        password_hash="not-used-in-this-suite",
        full_name="System Administrator",
        is_active=True,
        falsed_attempts=0,
    )
    db_session.add(administrator)
    db_session.commit()
    return administrator


@pytest.fixture()
def seeded_poi(db_session: Session) -> POI:
    """Seed one exhibit positioned inside the perimeter."""
    poi = POI(
        poi_id=EXISTING_POI_ID,
        title="Tunnel entrance",
        short_description="A narrow entry",
        latitude=Decimal(str(EXISTING_LATITUDE)),
        longitude=Decimal(str(EXISTING_LONGITUDE)),
        radius=EXISTING_RADIUS,
        is_active=True,
    )
    db_session.add(poi)
    db_session.commit()
    return poi


@pytest.fixture()
def poi_service(db_session: Session) -> POIService:
    return POIService(
        repository=POIRepository(db_session),
        audit_repository=AuditRepository(db_session),
    )


def _count_success_audits(db_session: Session) -> int:
    return db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_SUCCESS).count()


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_update_radius_and_write_a_success_audit_row(
    poi_service: POIService, seeded_admin, seeded_poi, db_session
):
    updated = poi_service.update_poi_geofence(
        EXISTING_POI_ID,
        POIUpdateRequest(radius=45),
        admin_user_name=ADMIN_USER_NAME,
        client_ip=CLIENT_IP,
    )

    assert updated.trigger_radius == 45
    assert seeded_poi.radius == 45
    # Coordinates were not part of the payload, so they must be untouched.
    assert float(seeded_poi.latitude) == EXISTING_LATITUDE
    assert float(seeded_poi.longitude) == EXISTING_LONGITUDE

    audit_row = (
        db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_SUCCESS).one()
    )
    assert audit_row.user_name == ADMIN_USER_NAME
    assert audit_row.ip_address == CLIENT_IP
    assert audit_row.details == POI_GEOFENCE_UPDATED_DETAILS


def test_should_persist_new_coordinates_as_decimal(
    poi_service: POIService, seeded_admin, seeded_poi
):
    updated = poi_service.update_poi_geofence(
        EXISTING_POI_ID,
        POIUpdateRequest(latitude=11.1501, longitude=106.4702),
        admin_user_name=ADMIN_USER_NAME,
    )

    assert updated.latitude == 11.1501
    assert updated.longitude == 106.4702
    # `Numeric(10, 7)` requires a Decimal, never a binary float.
    assert isinstance(seeded_poi.latitude, Decimal)
    assert isinstance(seeded_poi.longitude, Decimal)


def test_should_keep_the_untouched_axis_on_a_single_coordinate_update(
    poi_service: POIService, seeded_admin, seeded_poi
):
    updated = poi_service.update_poi_geofence(
        EXISTING_POI_ID,
        POIUpdateRequest(latitude=11.1400),
        admin_user_name=ADMIN_USER_NAME,
    )

    assert updated.latitude == 11.14
    # Longitude was omitted from the payload and must survive the update.
    assert updated.longitude == EXISTING_LONGITUDE


def test_should_still_accept_an_omitted_client_ip(
    poi_service: POIService, seeded_admin, seeded_poi, db_session
):
    poi_service.update_poi_geofence(
        EXISTING_POI_ID,
        POIUpdateRequest(radius=20),
        admin_user_name=ADMIN_USER_NAME,
        client_ip=None,
    )

    audit_row = (
        db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_SUCCESS).one()
    )
    assert audit_row.ip_address is None


def test_should_list_active_pois_without_a_language_filter(
    poi_service: POIService, seeded_poi
):
    items = poi_service.list_map_pois()

    assert [item.id for item in items] == [EXISTING_POI_ID]
    assert items[0].title == "Tunnel entrance"


# ---------------------------------------------------------------------------
# BOUNDARY: the four perimeter corners are inclusive.
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (MIN_LATITUDE, MIN_LONGITUDE),
        (MIN_LATITUDE, MAX_LONGITUDE),
        (MAX_LATITUDE, MIN_LONGITUDE),
        (MAX_LATITUDE, MAX_LONGITUDE),
    ],
)
def test_should_accept_coordinates_exactly_on_the_perimeter(
    poi_service: POIService, seeded_admin, seeded_poi, latitude, longitude
):
    updated = poi_service.update_poi_geofence(
        EXISTING_POI_ID,
        POIUpdateRequest(latitude=latitude, longitude=longitude),
        admin_user_name=ADMIN_USER_NAME,
    )

    assert updated.latitude == latitude
    assert updated.longitude == longitude


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (MIN_LATITUDE, MIN_LONGITUDE),
        (MIN_LATITUDE, MAX_LONGITUDE),
        (MAX_LATITUDE, MIN_LONGITUDE),
        (MAX_LATITUDE, MAX_LONGITUDE),
    ],
)
def test_should_accept_perimeter_corners_in_the_static_validator(latitude, longitude):
    # Must not raise for any of the four inclusive corners.
    POIService.validate_coordinates_in_bounds(latitude, longitude)


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (MIN_LATITUDE - 0.0001, EXISTING_LONGITUDE),
        (MAX_LATITUDE + 0.0001, EXISTING_LONGITUDE),
        (EXISTING_LATITUDE, MIN_LONGITUDE - 0.0001),
        (EXISTING_LATITUDE, MAX_LONGITUDE + 0.0001),
    ],
)
def test_should_reject_coordinates_outside_the_perimeter(
    poi_service: POIService, seeded_admin, seeded_poi, db_session, latitude, longitude
):
    with pytest.raises(ApiError) as raised_error:
        poi_service.update_poi_geofence(
            EXISTING_POI_ID,
            POIUpdateRequest(latitude=latitude, longitude=longitude),
            admin_user_name=ADMIN_USER_NAME,
            client_ip=CLIENT_IP,
        )

    assert raised_error.value.status_code == 400
    assert raised_error.value.detail["code"] == GEO_OUT_OF_BOUNDS_ERROR_CODE
    # A rejected write must not mutate the record nor be audited as success.
    assert float(seeded_poi.latitude) == EXISTING_LATITUDE
    assert float(seeded_poi.longitude) == EXISTING_LONGITUDE
    assert _count_success_audits(db_session) == 0


def test_should_validate_the_combined_position_on_a_partial_update(
    poi_service: POIService, seeded_admin, seeded_poi, db_session
):
    # Only the longitude is supplied, but the stored latitude is combined with
    # it, and that derived pair still has to sit inside the perimeter.
    with pytest.raises(ApiError) as raised_error:
        poi_service.update_poi_geofence(
            EXISTING_POI_ID,
            POIUpdateRequest(longitude=MAX_LONGITUDE + 0.01),
            admin_user_name=ADMIN_USER_NAME,
        )

    assert raised_error.value.detail["code"] == GEO_OUT_OF_BOUNDS_ERROR_CODE
    assert float(seeded_poi.longitude) == EXISTING_LONGITUDE
    assert _count_success_audits(db_session) == 0


def test_should_raise_not_found_when_the_exhibit_does_not_exist(
    poi_service: POIService, seeded_admin, db_session
):
    with pytest.raises(ApiError) as raised_error:
        poi_service.update_poi_geofence(
            "poi-missing",
            POIUpdateRequest(radius=40),
            admin_user_name=ADMIN_USER_NAME,
        )

    assert raised_error.value.status_code == 404
    assert raised_error.value.detail["code"] == POI_NOT_FOUND_ERROR_CODE
    assert _count_success_audits(db_session) == 0


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(-90.0, 0.0), (90.0, 0.0), (0.0, -180.0), (0.0, 180.0)],
)
def test_should_reject_far_away_coordinates_in_the_static_validator(
    latitude, longitude
):
    with pytest.raises(ApiError) as raised_error:
        POIService.validate_coordinates_in_bounds(latitude, longitude)

    assert raised_error.value.status_code == 400
