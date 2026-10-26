"""LanguageRepository: Data access layer for LanguageCode table."""

from sqlalchemy.orm import Session

from app.models.language import LanguageCode


class LanguageRepository:
    """Repository for querying language catalog data."""

    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[LanguageCode]:
        """Return all language codes."""
        return self.db.query(LanguageCode).all()
