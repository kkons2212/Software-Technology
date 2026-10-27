"""Unit tests for LanguageController (US 01.1)."""

from app.models.language import LanguageCode


def test_should_return_published_languages(client, db_session):
    existing = {lang.LanguageID for lang in db_session.query(LanguageCode).all()}
    if "vi" not in existing:
        db_session.add(LanguageCode(LanguageID="vi", LanguageName="Tiếng Việt"))
    if "en" not in existing:
        db_session.add(LanguageCode(LanguageID="en", LanguageName="English"))
    db_session.flush()

    response = client.get("/api/v1/languages")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
