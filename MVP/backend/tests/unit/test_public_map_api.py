"""Tests for the visitor-facing language and POI APIs."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models.audio import POIAudio
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation


@pytest.fixture
def client(db_session: Session):
    """Seed the catalog on the rollback-isolated MySQL session and serve it."""
    db_session.add_all(
        [
            LanguageCode(language_id="en", language_name="English"),
            LanguageCode(language_id="fr", language_name="French"),
            LanguageCode(language_id="ja", language_name="Japanese"),
            LanguageCode(language_id="de", language_name="German"),
        ]
    )
    db_session.add_all(
        [
            POI(
                poi_id="poi-1",
                title="Base title",
                short_description="Base summary",
                image_url="https://example.test/poi.jpg",
                latitude=10.1,
                longitude=106.2,
                radius=35,
                is_active=True,
            ),
            POI(
                poi_id="poi-2",
                title="Inactive",
                latitude=10.2,
                longitude=106.3,
                radius=30,
                is_active=False,
            ),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            POITranslation(
                stran_id="tr-en",
                title="Published English",
                short_description="English summary",
                status="PUBLISHED",
                poi_id="poi-1",
                language_id="en",
            ),
            POITranslation(
                stran_id="tr-fr",
                title="Draft French",
                status="DRAFT",
                poi_id="poi-1",
                language_id="fr",
            ),
            POITranslation(
                stran_id="tr-ja",
                title="Japanese audio pending",
                status="PUBLISHED",
                poi_id="poi-1",
                language_id="ja",
            ),
            POITranslation(
                stran_id="tr-de",
                title="Inactive POI translation",
                status="PUBLISHED",
                poi_id="poi-2",
                language_id="de",
            ),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            POIAudio(
                audio_id="audio-en",
                audio_url="https://example.test/en.mp3",
                status="READY",
                stran_id="tr-en",
            ),
            POIAudio(
                audio_id="audio-fr",
                audio_url="https://example.test/fr.mp3",
                status="READY",
                stran_id="tr-fr",
            ),
            POIAudio(
                audio_id="audio-ja",
                audio_url="https://example.test/ja.mp3",
                status="PROCESSING",
                stran_id="tr-ja",
            ),
            POIAudio(
                audio_id="audio-de",
                audio_url="https://example.test/de.mp3",
                status="READY",
                stran_id="tr-de",
            ),
        ]
    )
    db_session.commit()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_languages_only_include_published_content_with_ready_audio(client):
    response = client.get("/api/v1/languages")

    assert response.status_code == 200
    assert response.json() == {
        "data": [{"code": "en", "language_name": "English", "status": "PUBLISHED"}]
    }


def test_map_returns_active_pois_and_localizes_published_language(client):
    response = client.get("/api/v1/pois?language=en")

    assert response.status_code == 200
    assert response.json() == {
        "data": [
            {
                "id": "poi-1",
                "title": "Published English",
                "short_description": "English summary",
                "image_url": "https://example.test/poi.jpg",
                "latitude": 10.1,
                "longitude": 106.2,
                "trigger_radius": 35,
            }
        ]
    }


def test_map_without_language_uses_active_poi_content(client):
    response = client.get("/api/v1/pois")

    assert response.status_code == 200
    items = response.json()["data"]
    assert [item["id"] for item in items] == ["poi-1"]
    assert items[0]["title"] == "Base title"


def test_map_excludes_pois_without_published_audio_for_requested_language(client):
    response = client.get("/api/v1/pois?language=fr")

    assert response.status_code == 200
    assert response.json() == {"data": []}
