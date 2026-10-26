"""LanguageService: Business logic for supported and published languages."""

from typing import Any

from app.repositories.language_repository import LanguageRepository


class LanguageService:
    """Service layer handling language catalog logic."""

    def __init__(self, language_repo: LanguageRepository):
        self.language_repo = language_repo

    def get_published_languages(self) -> list[dict[str, Any]]:
        """Return published language summaries for visitor app."""
        languages = self.language_repo.list_all()
        return [
            {
                "language_id": lang.LanguageID,
                "language_name": lang.LanguageName,
                "status": "PUBLISHED",
            }
            for lang in languages
        ]
