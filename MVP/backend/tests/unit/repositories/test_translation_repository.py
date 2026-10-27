"""Unit tests for TranslationRepository (US 04.1)."""

import uuid

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation
from app.models.user import User
from app.repositories.translation_repository import TranslationRepository


def _seed_base_data(db_session):
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
        title="Địa đạo Củ Chi",
        short_description="Căn cứ địa cách mạng",
        description="Hệ thống địa đạo huyền thoại",
        latitude=11.1432,
        longitude=106.4631,
        radius=30,
        is_active=True,
    )
    db_session.add(poi)
    db_session.flush()

    tr_vi = POITranslation(
        stran_id=f"TR_{uuid.uuid4().hex[:8].upper()}",
        poi_id=poi_id,
        language_id="vi",
        title="Địa đạo Củ Chi",
        short_description="Căn cứ địa cách mạng",
        description="Hệ thống địa đạo huyền thoại",
        status="PUBLISHED",
    )
    tr_en = POITranslation(
        stran_id=f"TR_{uuid.uuid4().hex[:8].upper()}",
        poi_id=poi_id,
        language_id="en",
        title="Cu Chi Tunnels",
        short_description="Revolutionary base",
        description="Legendary tunnel system",
        status="DRAFT",
    )
    db_session.add_all([tr_vi, tr_en])
    db_session.commit()
    return poi, tr_vi, tr_en


def test_should_get_translations_with_filters(db_session):
    poi, tr_vi, tr_en = _seed_base_data(db_session)
    repo = TranslationRepository(db_session)

    # Filter by POI
    items, total = repo.get_translations(poi_id=poi.poi_id)
    assert total >= 2

    # Filter by language
    items_en, total_en = repo.get_translations(poi_id=poi.poi_id, language_id="en")
    assert total_en == 1
    assert items_en[0].language_id == "en"

    # Filter by status
    items_published, total_published = repo.get_translations(
        poi_id=poi.poi_id, status="PUBLISHED"
    )
    assert total_published == 1
    assert items_published[0].language_id == "vi"


def test_should_get_translation_by_id(db_session):
    _, _, tr_en = _seed_base_data(db_session)
    repo = TranslationRepository(db_session)

    found = repo.get_by_id(tr_en.stran_id)
    assert found is not None
    assert found.title == "Cu Chi Tunnels"


def test_should_get_source_translation_for_poi(db_session):
    poi, tr_vi, _ = _seed_base_data(db_session)
    repo = TranslationRepository(db_session)

    source = repo.get_source_translation(poi.poi_id)
    assert source is not None
    assert source.language_id == "vi"
    assert source.title == tr_vi.title


def test_should_update_translation_fields_atomically(db_session):
    _, _, tr_en = _seed_base_data(db_session)
    repo = TranslationRepository(db_session)

    updated = repo.update_translation(
        stran_id=tr_en.stran_id,
        title="Cu Chi Tunnels - Historical Site",
        description="Updated underground tunnel complex.",
        status="NEEDS_UPDATE",
        user_name="admin",
    )
    assert updated is not None
    assert updated.title == "Cu Chi Tunnels - Historical Site"
    assert updated.description == "Updated underground tunnel complex."
    assert updated.status == "NEEDS_UPDATE"
    assert updated.user_name == "admin"


def test_should_return_none_when_updating_nonexistent_translation(db_session):
    repo = TranslationRepository(db_session)
    result = repo.update_translation(stran_id="NON_EXISTENT", title="Test")
    assert result is None
