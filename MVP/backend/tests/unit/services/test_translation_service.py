"""Unit tests for TranslationService (US 04.1)."""

import uuid

import pytest
from fastapi import HTTPException

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.repositories.translation_repository import TranslationRepository
from app.schemas.translation_schema import TranslationUpdateRequest
from app.services.translation_service import TranslationService


def _seed_poi_with_translations(db_session):
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
    ]:
        if code not in existing_langs:
            db_session.add(LanguageCode(language_id=code, language_name=name))
    db_session.flush()

    poi_id = f"POI_{uuid.uuid4().hex[:8].upper()}"
    poi = POI(
        poi_id=poi_id,
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến giấu khói",
        description="Sáng chế bếp độc đáo thời kháng chiến",
        latitude=11.1440,
        longitude=106.4635,
        radius=30,
        is_active=True,
    )
    db_session.add(poi)
    db_session.flush()

    tr_vi = POITranslation(
        stran_id=f"TR_{uuid.uuid4().hex[:8].upper()}",
        poi_id=poi_id,
        language_id="vi",
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến giấu khói",
        description="Sáng chế bếp độc đáo thời kháng chiến",
        status="PUBLISHED",
    )
    tr_en = POITranslation(
        stran_id=f"TR_{uuid.uuid4().hex[:8].upper()}",
        poi_id=poi_id,
        language_id="en",
        title="Hoang Cam Stove",
        short_description="Smokeless field stove",
        description="Unique subterranean stove invention",
        status="DRAFT",
    )
    db_session.add_all([tr_vi, tr_en])
    db_session.commit()
    return poi, tr_vi, tr_en


def test_should_list_translations_with_source_text(db_session):
    poi, tr_vi, tr_en = _seed_poi_with_translations(db_session)
    service = TranslationService(
        translation_repo=TranslationRepository(db_session),
        audit_repo=AuditRepository(db_session),
        poi_repo=POIRepository(db_session),
    )

    response = service.list_translations(poi_id=poi.poi_id)
    assert response.total >= 2

    # Check English translation row has Vietnamese source text
    en_item = next(item for item in response.items if item.language_id == "en")
    assert en_item.source_title == "Bếp Hoàng Cầm"
    assert en_item.source_short_description == "Bếp dã chiến giấu khói"
    assert en_item.source_description == "Sáng chế bếp độc đáo thời kháng chiến"


def test_should_get_translation_by_id(db_session):
    _, _, tr_en = _seed_poi_with_translations(db_session)
    service = TranslationService(
        translation_repo=TranslationRepository(db_session),
        audit_repo=AuditRepository(db_session),
        poi_repo=POIRepository(db_session),
    )

    found = service.get_translation_by_id(tr_en.stran_id)
    assert found.stran_id == tr_en.stran_id
    assert found.title == "Hoang Cam Stove"


def test_should_raise_404_when_translation_not_found(db_session):
    service = TranslationService(
        translation_repo=TranslationRepository(db_session),
        audit_repo=AuditRepository(db_session),
    )

    with pytest.raises(HTTPException) as exc_info:
        service.get_translation_by_id("TR_NON_EXISTENT")
    assert exc_info.value.status_code == 404


def test_should_force_needs_update_status_when_text_is_edited(db_session):
    _, _, tr_en = _seed_poi_with_translations(db_session)
    audit_repo = AuditRepository(db_session)
    service = TranslationService(
        translation_repo=TranslationRepository(db_session),
        audit_repo=audit_repo,
    )

    # Edit title and description
    payload = TranslationUpdateRequest(
        title="Hoang Cam Smokeless Field Stove",
        description="Ingenious subterranean field stove that disperses smoke.",
    )
    result = service.update_translation(
        stran_id=tr_en.stran_id,
        payload=payload,
        admin_username="admin",
        ip_address="127.0.0.1",
    )

    # Invariant verified: Status forced to NEEDS_UPDATE
    assert result.status == "NEEDS_UPDATE"
    assert result.title == "Hoang Cam Smokeless Field Stove"
    assert "disperses smoke" in result.description


def test_should_allow_explicit_status_update_without_text_change(db_session):
    _, _, tr_en = _seed_poi_with_translations(db_session)
    service = TranslationService(
        translation_repo=TranslationRepository(db_session),
        audit_repo=AuditRepository(db_session),
    )

    payload = TranslationUpdateRequest(status="PUBLISHED")
    result = service.update_translation(
        stran_id=tr_en.stran_id,
        payload=payload,
        admin_username="admin",
    )
    assert result.status == "PUBLISHED"
    assert result.title == tr_en.title
