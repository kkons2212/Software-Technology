"""TelemetryRepository: Data access layer for POITrigger and VisitorSession."""

import uuid

from sqlalchemy.orm import Session

from app.models.poi import POI
from app.models.session import VisitorSession
from app.models.trigger import POITrigger


class TelemetryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_session(self, session_id: str) -> VisitorSession | None:
        return (
            self.db.query(VisitorSession)
            .filter(VisitorSession.SessionID == session_id)
            .first()
        )

    def create_guest_session(
        self, session_id: str | None = None, preferred_language: str = "vi"
    ) -> VisitorSession:
        sid = session_id if session_id else f"guest_{uuid.uuid4().hex[:14]}"
        session = VisitorSession(
            SessionID=sid,
            SessionCode=uuid.uuid4().hex[:8].upper(),
            SessionToken=uuid.uuid4().hex,
            Status="ACTIVE",
            PreferredLanguage=preferred_language,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_poi(self, poi_id: str) -> POI | None:
        return self.db.query(POI).filter(POI.PoiID == str(poi_id)).first()

    def create_trigger(
        self, session_id: str, poi_id: str, dwell_time: int = 0
    ) -> POITrigger:
        trigger = POITrigger(
            TriggerID=uuid.uuid4().hex[:20],
            SessionID=session_id,
            PoiID=str(poi_id),
            DwellTime=dwell_time,
        )
        self.db.add(trigger)
        self.db.commit()
        self.db.refresh(trigger)
        return trigger
