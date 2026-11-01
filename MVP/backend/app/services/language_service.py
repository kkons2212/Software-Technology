"""LanguageService: Business logic for supported and published languages."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.language_repository import LanguageRepository
from app.schemas.poi_schema import PublishedLanguage


def get_language_service(db: Annotated[Session, Depends(get_db)]) -> LanguageService:
    """Dependency provider injecting database session into LanguageService."""
    return LanguageService(LanguageRepository(db))


class LanguageService:
    """Service layer handling language catalog logic (SISE Compliant)."""

    def __init__(
        self,
        repository: LanguageRepository | None = None,
        language_repo: LanguageRepository | None = None,
    ) -> None:
        self.repository = repository or language_repo
        self.language_repo = self.repository

    def list_published(self) -> list[PublishedLanguage]:
        """Return published languages that have active translated POIs with ready audio."""
        # Phase 1 Gate: Guard against missing repository dependency
        if not self.repository:
            return []

        # Phase 2 Compute: Map repository records to published DTOs
        raw_languages = self.repository.list_published()
        resolved_languages: list[PublishedLanguage] = [
            PublishedLanguage(
                code=lang.language_id,
                language_name=lang.language_name,
                status="PUBLISHED",
            )
            for lang in raw_languages
        ]

        # Phase 3 Exit: Single structured return
        return resolved_languages

    def list_all(self) -> list[PublishedLanguage]:
        """Return all catalog languages with SUPPORTED status."""
        # Phase 1 Gate: Guard against missing repository dependency
        if not self.repository:
            return []

        # Phase 2 Compute: Map all catalog records to DTOs
        raw_languages = self.repository.list_all()
        resolved_languages: list[PublishedLanguage] = [
            PublishedLanguage(
                code=lang.language_id,
                language_name=lang.language_name,
                status="SUPPORTED",
            )
            for lang in raw_languages
        ]

        # Phase 3 Exit: Single structured return
        return resolved_languages

    def get_published_languages(self) -> list[dict[str, Any]]:
        """Return catalog languages as dictionary representations for legacy compatibility."""
        # Phase 1 Gate: Guard against missing repository dependency
        if not self.repository:
            return []

        # Phase 2 Compute: Extract dictionary representation with unified attribute access
        raw_languages = self.repository.list_all()
        resolved_dictionaries: list[dict[str, Any]] = [
            {
                "language_id": getattr(
                    lang, "language_id", getattr(lang, "LanguageID", "")
                ),
                "language_name": getattr(
                    lang, "language_name", getattr(lang, "LanguageName", "")
                ),
                "status": "PUBLISHED",
            }
            for lang in raw_languages
        ]

        # Phase 3 Exit: Single structured return
        return resolved_dictionaries

    def get_by_code(self, language_code: str) -> PublishedLanguage | None:
        """Resolve a specific catalog language by code."""
        # Phase 1 Gate: Reject empty language code
        if not language_code or not language_code.strip() or not self.repository:
            return None

        # Phase 2 Compute: Fetch and convert to DTO
        raw_language = self.repository.get_by_id(language_code)
        resolved_language: PublishedLanguage | None = None
        if raw_language is not None:
            resolved_language = PublishedLanguage(
                code=raw_language.language_id,
                language_name=raw_language.language_name,
                status="SUPPORTED",
            )

        # Phase 3 Exit: Single structured return
        return resolved_language
