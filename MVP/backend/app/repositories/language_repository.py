"""Persistence queries for publicly available languages."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audio import POIAudio
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation


class LanguageRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_published(self) -> list[LanguageCode]:
        statement = (
            select(LanguageCode)
            .join(
                POITranslation, POITranslation.language_id == LanguageCode.language_id
            )
            .join(POI, POI.poi_id == POITranslation.poi_id)
            .join(POIAudio, POIAudio.stran_id == POITranslation.stran_id)
            .where(
                POI.is_active.is_(True),
                func.upper(POITranslation.status) == "PUBLISHED",
                func.upper(POIAudio.status) == "READY",
            )
            .distinct()
            .order_by(LanguageCode.language_id)
        )
        return list(self.db.scalars(statement))
