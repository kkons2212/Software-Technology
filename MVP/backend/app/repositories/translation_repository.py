"""TranslationRepository encapsulating SQLAlchemy ORM data access for POITranslation."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.translation import POITranslation


class TranslationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_translations(
        self,
        poi_id: str | None = None,
        language_id: str | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[POITranslation], int]:
        """Fetch filtered POITranslation records with total count."""
        query = self.db.query(POITranslation)

        if poi_id:
            query = query.filter(POITranslation.poi_id == poi_id)
        if language_id:
            query = query.filter(POITranslation.language_id == language_id)
        if status:
            query = query.filter(func.upper(POITranslation.status) == status.upper())

        total = query.count()
        items = (
            query.order_by(POITranslation.create_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def get_by_id(self, stran_id: str) -> POITranslation | None:
        """Query a single POITranslation by primary key identifier."""
        return (
            self.db.query(POITranslation)
            .filter(POITranslation.stran_id == stran_id)
            .first()
        )

    def get_source_translation(self, poi_id: str) -> POITranslation | None:
        """Retrieve the primary Vietnamese source translation for a given POI."""
        return (
            self.db.query(POITranslation)
            .filter(
                POITranslation.poi_id == poi_id,
                POITranslation.language_id == "vi",
            )
            .first()
        )

    def update_translation(
        self,
        stran_id: str,
        title: str | None = None,
        short_description: str | None = None,
        description: str | None = None,
        status: str | None = None,
        user_name: str | None = None,
    ) -> POITranslation | None:
        """Atomically update translation fields and review status."""
        translation = self.get_by_id(stran_id)
        if not translation:
            return None

        if title is not None:
            translation.title = title
        if short_description is not None:
            translation.short_description = short_description
        if description is not None:
            translation.description = description
        if status is not None:
            translation.status = status
        if user_name is not None:
            translation.user_name = user_name

        translation.update_at = func.now()
        self.db.commit()
        self.db.refresh(translation)
        return translation

    def publish_translation(
        self,
        stran_id: str,
        admin_username: str,
    ) -> POITranslation | None:
        """Atomically set translation status to PUBLISHED and record reviewer metadata."""
        translation = self.get_by_id(stran_id)
        if not translation:
            return None

        translation.status = "PUBLISHED"
        translation.review_by = admin_username
        translation.review_at = func.now()
        translation.update_at = func.now()

        if translation.audio:
            translation.audio.status = "READY"
            translation.audio.update_at = func.now()

        self.db.commit()
        self.db.refresh(translation)
        return translation

    def create(self, translation: POITranslation) -> POITranslation:
        """Persist a new POITranslation record."""
        self.db.add(translation)
        self.db.commit()
        self.db.refresh(translation)
        return translation
