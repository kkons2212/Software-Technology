"""Persistence queries for public language and POI data."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audio import POIAudio
from app.models.poi import POI
from app.models.translation import POITranslation


class POIRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_active_pois(
        self, language_code: str | None = None
    ) -> list[tuple[POI, POITranslation | None]]:
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
