"""Paired unit tests for `app.services.poi_service`.

Covers US 03.2 — the Cu Chi bounding-box validator and the audited geofence
write, exercised through the real repositories against the rollback-isolated
MySQL session (so every assertion also proves that the persistence path:
Decimal coordinates, radius column, `Audit` row) — and TSK-03.1.2 / TSK-03.1.5:
exhibit creation, foreign translation seeding, image validation and listing.
"""

import io
from decimal import Decimal

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError
from app.models.audit import AUDIT_STATUS_SUCCESS, Audit
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import POICreateRequest, POIUpdateRequest
from app.services.poi_service import (
    GEO_OUT_OF_BOUNDS_ERROR_CODE,
    POI_GEOFENCE_UPDATED_DETAILS,
    POI_NOT_FOUND_ERROR_CODE,
    POIService,
    validate_coordinates_in_bounds,
    validate_image_file,
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
    """Geofence-calibration service built with the explicit constructor names."""
    return POIService(
        repository=POIRepository(db_session),
        audit_repository=AuditRepository(db_session),
    )


@pytest.fixture
def poi_catalog_service(db_session):
    """Exhibit-authoring service, seeded with the admin and the language codes."""
    admin = db_session.query(User).filter_by(user_name="admin").first()
    if not admin:
        admin = User(
            user_name="admin",
            email="admin@cuchi.gov.vn",
            password_hash="hash",
            is_active=True,
        )
        db_session.add(admin)

    existing_langs = {lang.language_id for lang in db_session.query(LanguageCode).all()}
    for code, name in [
        ("vi", "Tiếng Việt"),
        ("en", "English"),
        ("ja", "Japanese"),
        ("ko", "Korean"),
        ("zh", "Chinese"),
    ]:
        if code not in existing_langs:
            db_session.add(LanguageCode(language_id=code, language_name=name))
    db_session.flush()

    poi_repo = POIRepository(db_session)
    audit_repo = AuditRepository(db_session)
    return POIService(poi_repo=poi_repo, audit_repo=audit_repo)


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


# ---------------------------------------------------------------------------
# EXHIBIT AUTHORING (TSK-03.1.2 / TSK-03.1.5)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_should_create_poi_and_seed_foreign_translations_with_pending_status(
    poi_catalog_service,
):
    payload = POICreateRequest(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến không khói",
        description="Sáng chế bếp dã chiến giấu khói dưới lòng đất.",
        latitude=11.1440,
        longitude=106.4635,
        radius=30,
    )
    result = await poi_catalog_service.create_new_poi(payload, admin_username="admin")

    assert result.title == "Bếp Hoàng Cầm"
    assert result.radius == 30
    assert float(result.latitude) == 11.1440
    assert float(result.longitude) == 106.4635

    # Verify translations: 1 Vietnamese (PUBLISHED) + 4 foreign languages (PENDING)
    lang_statuses = {t.language_id: t.status for t in result.translations}
    assert lang_statuses.get("vi") == "PUBLISHED"
    assert lang_statuses.get("en") == "PENDING"
    assert lang_statuses.get("ja") == "PENDING"
    assert lang_statuses.get("ko") == "PENDING"
    assert lang_statuses.get("zh") == "PENDING"


def test_should_raise_400_when_coordinates_outside_cu_chi_bounds():
    # Outside latitude boundary
    with pytest.raises(HTTPException) as exc_info:
        validate_coordinates_in_bounds(10.5000, 106.4631)
    assert exc_info.value.status_code == 400

    # Outside longitude boundary
    with pytest.raises(HTTPException) as exc_info:
        validate_coordinates_in_bounds(11.1432, 105.0000)
    assert exc_info.value.status_code == 400


def test_should_raise_400_when_image_mime_invalid():
    dummy_file = UploadFile(
        filename="document.pdf",
        file=io.BytesIO(b"dummy pdf content"),
        headers={"content-type": "application/pdf"},
    )
    with pytest.raises(HTTPException) as exc_info:
        validate_image_file(dummy_file, b"dummy pdf content")
    assert exc_info.value.status_code == 400
    assert "Invalid image type" in str(exc_info.value.detail)


def test_should_raise_400_when_image_exceeds_size_limit():
    dummy_file = UploadFile(
        filename="huge.jpg", file=io.BytesIO(), headers={"content-type": "image/jpeg"}
    )
    oversized_bytes = b"0" * (6 * 1024 * 1024)  # 6 MB > 5 MB
    with pytest.raises(HTTPException) as exc_info:
        validate_image_file(dummy_file, oversized_bytes)
    assert exc_info.value.status_code == 400
    assert "exceeds the maximum permitted limit" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_should_log_audit_entry_when_poi_created(poi_catalog_service, db_session):
    payload = POICreateRequest(
        title="Hầm giải phẫu",
        short_description="Phòng phẫu thuật ngầm",
        description="Nơi cứu chữa thương binh.",
        latitude=11.1432,
        longitude=106.4631,
        radius=25,
    )
    await poi_catalog_service.create_new_poi(
        payload, admin_username="admin", ip_address="127.0.0.1"
    )

    # Direct verify audit in DB
    audit_record = db_session.query(Audit).filter(Audit.Status == "CREATE_POI").first()
    assert audit_record is not None
    assert audit_record.UserName == "admin"
    assert audit_record.Ip_address == "127.0.0.1"


@pytest.mark.asyncio
async def test_should_paginate_pois_and_search_in_service(poi_catalog_service):
    for i in range(3):
        await poi_catalog_service.create_new_poi(
            POICreateRequest(
                title=f"POI Point {i}",
                latitude=11.1430 + (i * 0.001),
                longitude=106.4630 + (i * 0.001),
                radius=30,
            ),
            admin_username="admin",
        )

    res = poi_catalog_service.list_pois(search="POI Point", page=1, size=2)
    assert res.total == 3
    assert len(res.items) == 2

    search_res = poi_catalog_service.list_pois(search="Point 1")
    assert search_res.total == 1
    assert search_res.items[0].title == "POI Point 1"


def test_should_raise_404_when_poi_id_not_found(poi_catalog_service):
    with pytest.raises(HTTPException) as exc_info:
        poi_catalog_service.get_poi_details("NONEXISTENT_ID")
    assert exc_info.value.status_code == 404
