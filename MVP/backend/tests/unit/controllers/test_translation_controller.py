"""Unit tests for TranslationController (US 04.1 & US 04.3)."""

import uuid

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation
from app.models.user import User


def _ensure_admin_and_seed_data(db_session):
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
        title="Hầm giải phẫu",
        short_description="Phòng phẫu thuật dã chiến",
        description="Nơi các bác sĩ quân y cứu chữa thương binh.",
        latitude=11.1442,
        longitude=106.4632,
        radius=25,
        is_active=True,
    )
    db_session.add(poi)
    db_session.flush()

    tr_vi = POITranslation(
        stran_id=f"TR_{uuid.uuid4().hex[:8].upper()}",
        poi_id=poi_id,
        language_id="vi",
        title="Hầm giải phẫu",
        short_description="Phòng phẫu thuật dã chiến",
        description="Nơi các bác sĩ quân y cứu chữa thương binh.",
        status="PUBLISHED",
    )
    tr_en = POITranslation(
        stran_id=f"TR_{uuid.uuid4().hex[:8].upper()}",
        poi_id=poi_id,
        language_id="en",
        title="Field Surgery Tunnel",
        short_description="Underground field surgery",
        description="Underground operating room for wounded soldiers.",
        status="DRAFT",
    )
    db_session.add_all([tr_vi, tr_en])
    db_session.commit()
    return poi, tr_vi, tr_en


def test_should_list_translations_via_api(client, db_session):
    poi, tr_vi, tr_en = _ensure_admin_and_seed_data(db_session)

    response = client.get(f"/api/v1/admin/translations?poi_id={poi.poi_id}")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 2

    # Check English translation response contains source Vietnamese text
    en_trans = next(
        item for item in data["items"] if item["stran_id"] == tr_en.stran_id
    )
    assert en_trans["source_title"] == "Hầm giải phẫu"
    assert en_trans["title"] == "Field Surgery Tunnel"


def test_should_filter_translations_by_language_and_status(client, db_session):
    poi, _, _ = _ensure_admin_and_seed_data(db_session)

    # Filter by language
    res_en = client.get(
        f"/api/v1/admin/translations?poi_id={poi.poi_id}&language_id=en"
    )
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert data_en["total"] == 1
    assert data_en["items"][0]["language_id"] == "en"

    # Filter by status
    res_draft = client.get(
        f"/api/v1/admin/translations?poi_id={poi.poi_id}&status=DRAFT"
    )
    assert res_draft.status_code == 200
    data_draft = res_draft.json()
    assert data_draft["total"] == 1
    assert data_draft["items"][0]["status"] == "DRAFT"


def test_should_get_single_translation_by_id(client, db_session):
    _, _, tr_en = _ensure_admin_and_seed_data(db_session)

    response = client.get(f"/api/v1/admin/translations/{tr_en.stran_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["stran_id"] == tr_en.stran_id
    assert data["title"] == "Field Surgery Tunnel"


def test_should_return_404_when_translation_not_found(client, db_session):
    _ensure_admin_and_seed_data(db_session)

    response = client.get("/api/v1/admin/translations/TR_NOT_FOUND")
    assert response.status_code == 404


def test_should_update_translation_and_force_needs_update_status(client, db_session):
    _, _, tr_en = _ensure_admin_and_seed_data(db_session)

    payload = {
        "title": "Subterranean Surgical Bunker",
        "description": "Refined historical description of the underground clinic.",
    }
    response = client.put(f"/api/v1/admin/translations/{tr_en.stran_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Subterranean Surgical Bunker"
    assert data["status"] == "NEEDS_UPDATE"


def test_should_return_404_when_updating_nonexistent_translation(client, db_session):
    _ensure_admin_and_seed_data(db_session)

    payload = {"title": "New Title"}
    response = client.put("/api/v1/admin/translations/TR_DOES_NOT_EXIST", json=payload)
    assert response.status_code == 404


def test_should_publish_translation_when_audio_is_ready(client, db_session):
    _, _, tr_en = _ensure_admin_and_seed_data(db_session)

    tr_en.audio_url = "/static/audio/field_surgery_en.mp3"
    tr_en.duration = 45.2
    tr_en.file_size = 72000
    db_session.commit()

    response = client.post(f"/api/v1/admin/translations/{tr_en.stran_id}/publish")
    assert response.status_code == 200
    data = response.json()
    assert data["stran_id"] == tr_en.stran_id
    assert data["status"] == "PUBLISHED"
    assert data["review_by"] == "admin"
    assert data["review_at"] is not None
    assert data["audio_status"] == "READY"


def test_should_reject_publish_when_status_is_needs_update(client, db_session):
    _, _, tr_en = _ensure_admin_and_seed_data(db_session)
    tr_en.status = "NEEDS_UPDATE"
    db_session.commit()

    tr_en.audio_url = "/static/audio/old_audio.mp3"
    db_session.commit()

    response = client.post(f"/api/v1/admin/translations/{tr_en.stran_id}/publish")
    assert response.status_code == 400
    error_msg = response.json().get("error", {}).get("message", "")
    assert "desynchronized" in error_msg.lower()


def test_should_reject_publish_when_audio_is_missing_or_not_ready(client, db_session):
    _, _, tr_en = _ensure_admin_and_seed_data(db_session)
    # No audio seeded
    response = client.post(f"/api/v1/admin/translations/{tr_en.stran_id}/publish")
    assert response.status_code == 400
    error_msg = response.json().get("error", {}).get("message", "")
    assert "audio" in error_msg.lower()


def test_should_return_404_when_publishing_nonexistent_translation(client, db_session):
    _ensure_admin_and_seed_data(db_session)

    response = client.post("/api/v1/admin/translations/TR_NONEXISTENT/publish")
    assert response.status_code == 404
