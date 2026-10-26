"""POIRepository encapsulating 100% SQLAlchemy ORM data access operations for POI."""

from sqlalchemy.orm import Session

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
        return self.db.query(POI).filter(POI.PoiID == poi_id).first()

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
            query = query.filter(POI.Is_Active.is_(True))
        if search:
            query = query.filter(POI.Title.ilike(f"%{search}%"))

        total = query.count()
        items = query.order_by(POI.Create_at.desc()).offset(skip).limit(limit).all()
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
            self.db.query(POITranslation).filter(POITranslation.PoiID == poi_id).all()
        )
