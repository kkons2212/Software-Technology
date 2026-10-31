"""LanguageRepository: Data access layer for LanguageCode table."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation


class LanguageRepository:
    """Repository for querying language catalog data."""

    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[LanguageCode]:
        """Return all language codes."""
        return list(
            self.db.scalars(select(LanguageCode).order_by(LanguageCode.language_id))
        )

    def list_target_foreign_language_ids(
        self, source_language: str = "vi"
    ) -> list[str]:
        """Return all target foreign language codes excluding the source language ('vi')."""
        statement = (
            select(LanguageCode.language_id)
            .where(func.lower(LanguageCode.language_id) != source_language.lower())
            .order_by(LanguageCode.language_id)
        )
        return list(self.db.scalars(statement))

    def list_published(self) -> list[LanguageCode]:
        """Return languages that have at least one active, published POI translation with ready audio."""
        statement = (
            select(LanguageCode)
            .join(
                POITranslation, POITranslation.language_id == LanguageCode.language_id
            )
            .join(POI, POI.poi_id == POITranslation.poi_id)
            .where(
                POI.is_active.is_(True),
                func.upper(POITranslation.status) == "PUBLISHED",
                POITranslation.audio_url.is_not(None),
            )
            .distinct()
            .order_by(LanguageCode.language_id)
        )
        return list(self.db.scalars(statement))
