"""Public POI application service."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import POIMapItem


def get_poi_service(db: Annotated[Session, Depends(get_db)]) -> "POIService":
    return POIService(POIRepository(db))


class POIService:
    def __init__(self, repository: POIRepository):
        self.repository = repository

    def list_map_pois(self, language_code: str | None = None) -> list[POIMapItem]:
        result = []
        for poi, translation in self.repository.list_active_pois(language_code):
            result.append(
                POIMapItem(
                    id=poi.poi_id,
                    title=translation.title if translation else poi.title,
                    short_description=(
                        translation.short_description
                        if translation
                        else poi.short_description
                    ),
                    image_url=poi.image_url,
                    latitude=float(poi.latitude),
                    longitude=float(poi.longitude),
                    trigger_radius=poi.radius,
                )
            )
        return result
