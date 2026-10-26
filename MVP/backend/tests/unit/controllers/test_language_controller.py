"""Unit tests for LanguageController (US 01.1)."""

from app.models.language import LanguageCode


def test_should_return_published_languages(client, db_session):
    vi = LanguageCode(LanguageID="vi", LanguageName="Tiếng Việt")
    en = LanguageCode(LanguageID="en", LanguageName="English")
    db_session.add_all([vi, en])
    db_session.commit()

    response = client.get("/api/v1/languages")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    lang_ids = [item["language_id"] for item in data]
    assert "vi" in lang_ids
    assert "en" in lang_ids
