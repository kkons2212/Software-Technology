"""Unit test suite for LanguageService and LanguageRepository (REF-01.2 & REF-01.3)."""

from unittest.mock import MagicMock

import pytest

from app.models.language import LanguageCode
from app.repositories.language_repository import LanguageRepository
from app.schemas.poi_schema import PublishedLanguage
from app.services.language_service import LanguageService


@pytest.fixture
def mock_language_repository():
    repo = MagicMock(spec=LanguageRepository)
    return repo


@pytest.fixture
def sample_languages():
    return [
        LanguageCode(language_id="vi", language_name="Tiếng Việt"),
        LanguageCode(language_id="en", language_name="English"),
        LanguageCode(language_id="ja", language_name="Japanese"),
    ]


def test_list_published_returns_dtos(mock_language_repository, sample_languages):
    """Verifies list_published maps models to PublishedLanguage DTOs with PUBLISHED status."""
    mock_language_repository.list_published.return_value = sample_languages[:2]
    service = LanguageService(repository=mock_language_repository)

    result = service.list_published()

    assert len(result) == 2
    assert isinstance(result[0], PublishedLanguage)
    assert result[0].code == "vi"
    assert result[0].language_name == "Tiếng Việt"
    assert result[0].status == "PUBLISHED"
    assert result[1].code == "en"
    assert result[1].status == "PUBLISHED"


def test_list_published_empty_when_no_repo():
    """Verifies list_published gracefully returns empty list when repository is None."""
    service = LanguageService(repository=None)
    result = service.list_published()
    assert result == []


def test_list_all_returns_supported_dtos(mock_language_repository, sample_languages):
    """Verifies list_all maps all catalog models to PublishedLanguage DTOs with SUPPORTED status."""
    mock_language_repository.list_all.return_value = sample_languages
    service = LanguageService(repository=mock_language_repository)

    result = service.list_all()

    assert len(result) == 3
    assert result[0].code == "vi"
    assert result[0].status == "SUPPORTED"
    assert result[2].code == "ja"
    assert result[2].status == "SUPPORTED"


def test_get_published_languages_dict(mock_language_repository, sample_languages):
    """Verifies get_published_languages returns dictionary representations."""
    mock_language_repository.list_all.return_value = sample_languages
    service = LanguageService(repository=mock_language_repository)

    result = service.get_published_languages()

    assert len(result) == 3
    assert result[0] == {
        "language_id": "vi",
        "language_name": "Tiếng Việt",
        "status": "PUBLISHED",
    }


def test_get_by_code_resolves_dto(mock_language_repository, sample_languages):
    """Verifies get_by_code resolves single language DTO or returns None for empty code."""
    mock_language_repository.get_by_id.return_value = sample_languages[1]
    service = LanguageService(repository=mock_language_repository)

    # Valid lookup
    found = service.get_by_code("en")
    assert found is not None
    assert found.code == "en"
    assert found.language_name == "English"
    assert found.status == "SUPPORTED"

    # Empty code gate
    empty_result = service.get_by_code("")
    assert empty_result is None
    mock_language_repository.get_by_id.assert_called_once_with("en")


def test_language_repository_get_by_id_gate():
    """Verifies LanguageRepository.get_by_id Phase 1 gate returns None for empty input without DB calls."""
    mock_db = MagicMock()
    repo = LanguageRepository(db=mock_db)

    result_empty = repo.get_by_id("")
    result_whitespace = repo.get_by_id("   ")

    assert result_empty is None
    assert result_whitespace is None
    mock_db.scalars.assert_not_called()
