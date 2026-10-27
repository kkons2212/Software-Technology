"""LanguageService: Business logic for supported and published languages."""

from typing import Any

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.language_repository import LanguageRepository
from app.schemas.poi_schema import PublishedLanguage


def get_language_service(db: Session = Depends(get_db)) -> "LanguageService":
    return LanguageService(LanguageRepository(db))


class LanguageService:
    """Service layer handling language catalog logic."""

    def __init__(
        self,
        repository: LanguageRepository | None = None,
        language_repo: LanguageRepository | None = None,
    ):
        self.repository = repository or language_repo
        self.language_repo = self.repository

    def list_published(self) -> list[PublishedLanguage]:
        """Return published languages that have active translated POIs with ready audio."""
        return [
            PublishedLanguage(
                code=language.language_id,
                language_name=language.language_name,
                status="PUBLISHED",
            )
            for language in self.repository.list_published()
        ]

    def get_published_languages(self) -> list[dict[str, Any]]:
        """Return all catalog languages."""
        languages = self.repository.list_all()
        return [
            {
                "language_id": lang.LanguageID,
                "language_name": lang.LanguageName,
                "status": "PUBLISHED",
            }
            for lang in languages
        ]
