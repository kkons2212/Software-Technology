"""TelemetryRepository: Data access layer for POITrigger and VisitorSession."""

import uuid
from datetime import datetime

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.language import LanguageCode
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

    # -------------------------------------------------------------------------
    # Read-only analytics aggregations (US 05.2 & US 05.1)
    # Each query filters or groups on an existing DDL index so the admin summary
    # stays sub-second: idx_POITrigger_Trigger_at, idx_POITrigger_PoiID and
    # idx_VisitorSession_PreferredLanguage.
    # -------------------------------------------------------------------------

    def count_visitor_sessions(self, range_start: datetime) -> int:
        """Count visitor sessions created within the reporting window."""
        total = (
            self.db.query(func.count(VisitorSession.SessionID))
            .filter(VisitorSession.Create_at >= range_start)
            .scalar()
        )
        return int(total or 0)

    def count_triggers(self, range_start: datetime) -> int:
        """Count POI proximity triggers recorded within the reporting window."""
        total = (
            self.db.query(func.count(POITrigger.TriggerID))
            .filter(POITrigger.Trigger_at >= range_start)
            .scalar()
        )
        return int(total or 0)

    def average_tour_duration_seconds(self, range_start: datetime) -> float:
        """Average per-visitor total dwell seconds (tour length) in the window.

        Tour duration is a per-session metric, so the SUM(DwellTime) is grouped by
        SessionID first and only then averaged; a flat AVG(DwellTime) would instead
        report the average dwell per exhibit, not per visitor (US 05.2).
        """
        per_session_totals = (
            self.db.query(
                POITrigger.SessionID.label("session_id"),
                func.sum(POITrigger.DwellTime).label("total_dwell"),
            )
            .filter(POITrigger.Trigger_at >= range_start)
            .group_by(POITrigger.SessionID)
            .subquery()
        )
        average = self.db.query(func.avg(per_session_totals.c.total_dwell)).scalar()
        return float(average or 0.0)

    def list_poi_trigger_counts(
        self, range_start: datetime, limit: int
    ) -> list[tuple[str, str, int]]:
        """Rank exhibits by trigger volume, returning (poi_id, title, count) rows."""
        rows = (
            self.db.query(
                POI.PoiID,
                POI.Title,
                func.count(POITrigger.TriggerID).label("trigger_count"),
            )
            .join(POITrigger, POITrigger.PoiID == POI.PoiID)
            .filter(POITrigger.Trigger_at >= range_start)
            .group_by(POI.PoiID, POI.Title)
            .order_by(func.count(POITrigger.TriggerID).desc(), POI.Title.asc())
            .limit(limit)
            .all()
        )
        return [(row[0], row[1], int(row[2])) for row in rows]

    def list_language_distribution(
        self, range_start: datetime
    ) -> list[tuple[str, str, int]]:
        """Rank visitor language choices, returning (language_id, name, count) rows."""
        rows = (
            self.db.query(
                VisitorSession.PreferredLanguage,
                LanguageCode.LanguageName,
                func.count(VisitorSession.SessionID).label("visitor_count"),
            )
            .join(
                LanguageCode,
                LanguageCode.LanguageID == VisitorSession.PreferredLanguage,
            )
            .filter(VisitorSession.Create_at >= range_start)
            .group_by(VisitorSession.PreferredLanguage, LanguageCode.LanguageName)
            # Language ID tiebreaker keeps equal-volume periods stable across calls.
            .order_by(
                func.count(VisitorSession.SessionID).desc(),
                VisitorSession.PreferredLanguage.asc(),
            )
            .all()
        )
        return [(row[0], row[1], int(row[2])) for row in rows]

    def list_heatmap_poi_triggers(
        self, range_start: datetime
    ) -> list[tuple[str, str, float, float, int]]:
        """Aggregate POI trigger coordinates and volumes for heatmap (US 05.1).

        Uses OUTER JOIN so all active exhibits appear on the map. Exhibits with zero
        triggers are returned with trigger_count = 0 (rendered as gray markers).
        """
        rows = (
            self.db.query(
                POI.PoiID,
                POI.Title,
                POI.Latitude,
                POI.Longitude,
                func.count(POITrigger.TriggerID).label("trigger_count"),
            )
            .outerjoin(
                POITrigger,
                and_(
                    POITrigger.PoiID == POI.PoiID,
                    POITrigger.Trigger_at >= range_start,
                ),
            )
            .filter(POI.is_active.is_(True))
            .group_by(POI.PoiID, POI.Title, POI.Latitude, POI.Longitude)
            .order_by(func.count(POITrigger.TriggerID).desc(), POI.Title.asc())
            .all()
        )
        return [
            (row[0], row[1], float(row[2]), float(row[3]), int(row[4]))
            for row in rows
        ]
