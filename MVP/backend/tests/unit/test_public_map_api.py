"""Tests for the visitor-facing language and POI APIs."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation


@pytest.fixture
def mysql_test_data(db_session: Session):
    """Seed catalog rows inside the rollback-isolated MySQL session."""
    token = uuid4().hex[:8]
    language_ids = {
        language: f"t{token}{language}" for language in ("en", "fr", "ja", "de")
    }
    poi_ids = {"active": f"t{token}a", "inactive": f"t{token}i"}
    translation_ids = {language: f"t{token}{language}tr" for language in language_ids}

    db_session.add_all(
        [
            LanguageCode(
                language_id=language_ids[language],
                language_name=f"Test {token} {language.upper()}",
            )
            for language in language_ids
        ]
    )
    db_session.add_all(
        [
            POI(
                poi_id=poi_ids["active"],
                title="Base title",
                short_description="Base summary",
                image_url="https://example.test/poi.jpg",
                latitude=10.1,
                longitude=106.2,
                radius=35,
                is_active=True,
            ),
            POI(
                poi_id=poi_ids["inactive"],
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
                stran_id=translation_ids["en"],
                title="Published English",
                short_description="English summary",
                status="PUBLISHED",
                poi_id=poi_ids["active"],
                language_id=language_ids["en"],
                audio_url="https://example.test/en.mp3",
            ),
            POITranslation(
                stran_id=translation_ids["fr"],
                title="Draft French",
                status="DRAFT",
                poi_id=poi_ids["active"],
                language_id=language_ids["fr"],
                audio_url="https://example.test/fr.mp3",
            ),
            POITranslation(
                stran_id=translation_ids["ja"],
                title="Japanese audio pending",
                status="PUBLISHED",
                poi_id=poi_ids["active"],
                language_id=language_ids["ja"],
                audio_url=None,
            ),
            POITranslation(
                stran_id=translation_ids["de"],
                title="Inactive POI translation",
                status="PUBLISHED",
                poi_id=poi_ids["inactive"],
                language_id=language_ids["de"],
                audio_url="https://example.test/de.mp3",
            ),
        ]
    )
    db_session.flush()
    return {"language_ids": language_ids, "poi_ids": poi_ids}


@pytest.fixture
def client(db_session: Session, mysql_test_data):
    """Serve requests through the same transaction that will be rolled back."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def test_languages_only_include_published_content_with_ready_audio(
    client, mysql_test_data
):
    response = client.get("/api/v1/languages")

    assert response.status_code == 200
    languages = {item["code"]: item for item in response.json()["data"]}
    language_ids = mysql_test_data["language_ids"]
    assert languages[language_ids["en"]]["status"] == "PUBLISHED"
    assert languages[language_ids["en"]]["language_name"].endswith(" EN")
    assert language_ids["fr"] not in languages
    assert language_ids["ja"] not in languages
    assert language_ids["de"] not in languages


def test_map_returns_active_pois_and_localizes_published_language(
    client, mysql_test_data
):
    language_id = mysql_test_data["language_ids"]["en"]
    poi_id = mysql_test_data["poi_ids"]["active"]
    response = client.get(f"/api/v1/pois?language={language_id}")

    assert response.status_code == 200
    assert response.json() == {
        "data": [
            {
                "id": poi_id,
                "title": "Published English",
                "short_description": "English summary",
                "image_url": "https://example.test/poi.jpg",
                "latitude": 10.1,
                "longitude": 106.2,
                "trigger_radius": 35,
            }
        ]
    }


def test_map_without_language_uses_active_poi_content(client, mysql_test_data):
    response = client.get("/api/v1/pois")

    assert response.status_code == 200
    pois_by_id = {item["id"]: item for item in response.json()["data"]}
    poi_ids = mysql_test_data["poi_ids"]
    assert pois_by_id[poi_ids["active"]]["title"] == "Base title"
    assert poi_ids["inactive"] not in pois_by_id


def test_map_excludes_pois_without_published_audio_for_requested_language(
    client, mysql_test_data
):
    language_id = mysql_test_data["language_ids"]["fr"]
    response = client.get(f"/api/v1/pois?language={language_id}")

    assert response.status_code == 200
    assert response.json() == {"data": []}
