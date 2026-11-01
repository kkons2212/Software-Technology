"""SQLAlchemy model for POITrigger table."""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship, synonym

from app.core.database import Base


class POITrigger(Base):
    __tablename__ = "POITrigger"

    TriggerID = Column(
        String(20), primary_key=True, default=lambda: uuid.uuid4().hex[:20]
    )
    DwellTime = Column(Integer, nullable=False, default=0)
    Trigger_at = Column(DateTime, nullable=False, default=func.now())
    SessionID = Column(
        String(20),
        ForeignKey("VisitorSession.SessionID", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    PoiID = Column(
        String(20),
        ForeignKey("POI.PoiID", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    session = relationship("VisitorSession", back_populates="triggers")
    poi = relationship("POI")

    # Synonyms for snake_case attribute access
    trigger_id = synonym("TriggerID")
    dwell_time = synonym("DwellTime")
    trigger_at = synonym("Trigger_at")
    session_id = synonym("SessionID")
    poi_id = synonym("PoiID")
