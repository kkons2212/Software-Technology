"""POIRepository encapsulating SQLAlchemy ORM data access operations for POI."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audio import POIAudio
from app.models.poi import POI
from app.models.translation import POITranslation


class POIRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, poi: POI) -> POI:
        """Persist a new POI entity into the database."""
        self.db.add(poi)
        self.db.commit()
        self.db.refresh(poi)
        return poi

    def get_by_id(self, poi_id: str) -> POI | None:
        """Query a single POI by its primary key identifier."""
        return self.db.query(POI).filter(POI.poi_id == poi_id).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        is_active_only: bool = False,
    ) -> tuple[list[POI], int]:
        """Query paginated POIs with optional search filter by title."""
        query = self.db.query(POI)
        if is_active_only:
            query = query.filter(POI.is_active.is_(True))
        if search:
            query = query.filter(POI.title.ilike(f"%{search}%"))

        total = query.count()
        items = query.order_by(POI.create_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def create_translation(self, translation: POITranslation) -> POITranslation:
        """Persist a POITranslation record."""
        self.db.add(translation)
        self.db.commit()
        self.db.refresh(translation)
        return translation

    def get_translations_by_poi_id(self, poi_id: str) -> list[POITranslation]:
        """Fetch all translations for a given POI."""
        return (
            self.db.query(POITranslation).filter(POITranslation.poi_id == poi_id).all()
        )

    def list_active_pois(
        self, language_code: str | None = None
    ) -> list[tuple[POI, POITranslation | None]]:
        """List active POIs for public visitor map, optionally localized with published translations and ready audio."""
        if not language_code:
            statement = select(POI).where(POI.is_active.is_(True)).order_by(POI.poi_id)
            return [(poi, None) for poi in self.db.scalars(statement)]

        statement = (
            select(POI, POITranslation)
            .join(POITranslation, POITranslation.poi_id == POI.poi_id)
            .join(POIAudio, POIAudio.stran_id == POITranslation.stran_id)
            .where(
                POI.is_active.is_(True),
                POITranslation.language_id == language_code,
                func.upper(POITranslation.status) == "PUBLISHED",
                func.upper(POIAudio.status) == "READY",
            )
            .distinct()
            .order_by(POI.poi_id)
        )
        return list(self.db.execute(statement).all())
