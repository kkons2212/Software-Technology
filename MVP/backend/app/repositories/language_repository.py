"""LanguageRepository: Data access layer for LanguageCode table."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation


class LanguageRepository:
    """Repository for querying language catalog data."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, language_id: str) -> LanguageCode | None:
        """Fetch a single language code record by its identifier."""
        # Phase 1 Gate: Reject empty identifier
        if not language_id or not language_id.strip():
            return None

        # Phase 2 Compute: Execute case-insensitive lookup
        statement = select(LanguageCode).where(
            func.lower(LanguageCode.language_id) == language_id.strip().lower()
        )
        found_language = self.db.scalars(statement).first()

        # Phase 3 Exit: Single structured return
        return found_language

    def list_all(self) -> list[LanguageCode]:
        """Return all language codes ordered by identifier."""
        # Phase 2 Compute: Select all catalog records
        statement = select(LanguageCode).order_by(LanguageCode.language_id)
        all_languages = list(self.db.scalars(statement).all())

        # Phase 3 Exit: Unified return
        return all_languages

    def list_target_foreign_language_ids(
        self, source_language: str = "vi"
    ) -> list[str]:
        """Return all target foreign language codes excluding the source language ('vi')."""
        # Phase 1 Gate: Normalize source language filter
        normalized_source = (source_language or "vi").strip().lower()

        # Phase 2 Compute: Query non-source language IDs
        statement = (
            select(LanguageCode.language_id)
            .where(func.lower(LanguageCode.language_id) != normalized_source)
            .order_by(LanguageCode.language_id)
        )
        target_ids = list(self.db.scalars(statement).all())

        # Phase 3 Exit: Single structured return
        return target_ids

    def list_published(self) -> list[LanguageCode]:
        """Return languages that have at least one active, published POI translation with ready audio."""
        # Phase 2 Compute: Join POI and POITranslation with PUBLISHED audio status
        statement = (
            select(LanguageCode)
            .join(
                POITranslation,
                POITranslation.language_id == LanguageCode.language_id,
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
        published_languages = list(self.db.scalars(statement).all())

        # Phase 3 Exit: Unified return
        return published_languages
