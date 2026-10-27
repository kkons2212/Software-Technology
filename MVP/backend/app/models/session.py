"""SQLAlchemy model for VisitorSession table."""

import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


def get_default_expire_at():
    return datetime.datetime.utcnow() + datetime.timedelta(hours=24)


class VisitorSession(Base):
    __tablename__ = "VisitorSession"

    SessionID = Column(
        String(20), primary_key=True, default=lambda: uuid.uuid4().hex[:20]
    )
    SessionCode = Column(
        String(255),
        unique=True,
        nullable=False,
        default=lambda: uuid.uuid4().hex[:8].upper(),
    )
    SessionToken = Column(
        String(255), unique=True, nullable=False, default=lambda: uuid.uuid4().hex
    )
    DeviceFingerPrint = Column(String(255), nullable=True)
    Status = Column(String(255), nullable=False, default="ACTIVE")
    Activate_at = Column(DateTime, nullable=False, default=func.now())
    Expire_at = Column(DateTime, nullable=False, default=get_default_expire_at)
    Create_at = Column(DateTime, nullable=False, default=func.now())
    PreferredLanguage = Column(
        String(20), ForeignKey("LanguageCode.LanguageID"), nullable=False, default="vi"
    )

    language = relationship("LanguageCode")
    triggers = relationship(
        "POITrigger", back_populates="session", cascade="all, delete-orphan"
    )
