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


def test_should_return_all_catalog_languages(client, db_session):
    existing = {lang.LanguageID for lang in db_session.query(LanguageCode).all()}
    for code, name in [
        ("vi", "Tiếng Việt"),
        ("en", "English"),
        ("ja", "Japanese"),
        ("ko", "Korean"),
        ("zh", "Chinese"),
    ]:
        if code not in existing:
            db_session.add(LanguageCode(LanguageID=code, LanguageName=name))
    db_session.flush()

    response = client.get("/api/v1/languages?all=true")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    codes = [item["code"] for item in data["data"]]
    assert "en" in codes
    assert "ja" in codes
    assert "ko" in codes
    assert "zh" in codes
