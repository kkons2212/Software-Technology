"""Unit tests for POIService (TSK-03.1.2 & TSK-03.1.5)."""

import io

import pytest
from fastapi import HTTPException, UploadFile

from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import POICreateRequest
from app.services.poi_service import (
    POIService,
    validate_coordinates_in_bounds,
    validate_image_file,
)


@pytest.fixture
def poi_service(db_session):
    from app.models.user import User

    admin = db_session.query(User).filter_by(user_name="admin").first()
    if not admin:
        admin = User(
            user_name="admin",
            email="admin@cuchi.gov.vn",
            password_hash="hash",
            is_active=True,
        )
        db_session.add(admin)
        db_session.flush()

    poi_repo = POIRepository(db_session)
    audit_repo = AuditRepository(db_session)
    return POIService(poi_repo=poi_repo, audit_repo=audit_repo)


@pytest.mark.asyncio
async def test_should_create_poi_and_seed_foreign_translations_with_pending_status(
    poi_service,
):
    payload = POICreateRequest(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến không khói",
        description="Sáng chế bếp dã chiến giấu khói dưới lòng đất.",
        latitude=11.1440,
        longitude=106.4635,
        radius=30,
    )
    result = await poi_service.create_new_poi(payload, admin_username="admin")

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
async def test_should_log_audit_entry_when_poi_created(poi_service, db_session):
    payload = POICreateRequest(
        title="Hầm giải phẫu",
        short_description="Phòng phẫu thuật ngầm",
        description="Nơi cứu chữa thương binh.",
        latitude=11.1432,
        longitude=106.4631,
        radius=25,
    )
    await poi_service.create_new_poi(
        payload, admin_username="admin", ip_address="127.0.0.1"
    )

    # Direct verify audit in DB
    from app.models.audit import Audit

    audit_record = db_session.query(Audit).filter(Audit.Status == "CREATE_POI").first()
    assert audit_record is not None
    assert audit_record.UserName == "admin"
    assert audit_record.Ip_address == "127.0.0.1"


@pytest.mark.asyncio
async def test_should_paginate_pois_and_search_in_service(poi_service):
    for i in range(3):
        await poi_service.create_new_poi(
            POICreateRequest(
                title=f"POI Point {i}",
                latitude=11.1430 + (i * 0.001),
                longitude=106.4630 + (i * 0.001),
                radius=30,
            ),
            admin_username="admin",
        )

    res = poi_service.list_pois(search="POI Point", page=1, size=2)
    assert res.total == 3
    assert len(res.items) == 2

    search_res = poi_service.list_pois(search="Point 1")
    assert search_res.total == 1
    assert search_res.items[0].title == "POI Point 1"


def test_should_raise_404_when_poi_id_not_found(poi_service):
    with pytest.raises(HTTPException) as exc_info:
        poi_service.get_poi_details("NONEXISTENT_ID")
    assert exc_info.value.status_code == 404
