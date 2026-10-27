"""Public language application service."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.language_repository import LanguageRepository
from app.schemas.poi_schema import PublishedLanguage


def get_language_service(db: Annotated[Session, Depends(get_db)]) -> "LanguageService":
    return LanguageService(LanguageRepository(db))


class LanguageService:
    def __init__(self, repository: LanguageRepository):
        self.repository = repository

    def list_published(self) -> list[PublishedLanguage]:
        return [
            PublishedLanguage(
                code=language.language_id,
                language_name=language.language_name,
                status="PUBLISHED",
            )
            for language in self.repository.list_published()
        ]
