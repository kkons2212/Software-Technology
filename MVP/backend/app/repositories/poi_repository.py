"""Persistence queries for public language and Admin POI data."""

from decimal import Decimal

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

    def get_by_id(self, poi_id: str) -> POI | None:
        """Fetch a single POI by primary key, or `None` when it is absent."""
        return self.db.get(POI, poi_id)

    def update_geofence(
        self,
        poi: POI,
        latitude: float | None = None,
        longitude: float | None = None,
        radius: int | None = None,
    ) -> POI:
        """Persist only the supplied geofence fields and return the POI.

        Coordinates are stored as `Decimal` to match the `Numeric(10, 7)`
        column, so the float coming from the map never introduces binary
        rounding drift on the stored value.
        """
        if latitude is not None:
            poi.latitude = Decimal(str(latitude))
        if longitude is not None:
            poi.longitude = Decimal(str(longitude))
        if radius is not None:
            poi.radius = radius
        self.db.commit()
        self.db.refresh(poi)
        return poi
