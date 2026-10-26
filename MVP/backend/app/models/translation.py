"""SQLAlchemy model for POITranslation table."""

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class POITranslation(Base):
    __tablename__ = "POITranslation"

    StranID = Column(String(20), primary_key=True, index=True)
    Title = Column(String(255), nullable=False)
    Short_Description = Column(String(255), nullable=True)
    Description = Column(Text, nullable=True)
    Status = Column(String(255), nullable=False, default="PENDING", index=True)
    Review_at = Column(DateTime, nullable=True)
    Create_at = Column(DateTime, nullable=False, default=func.now())
    Update_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    Review_by = Column(String(20), nullable=True)
    PoiID = Column(String(20), ForeignKey("POI.PoiID", ondelete="CASCADE"), nullable=False, index=True)
    LanguageID = Column(String(20), ForeignKey("LanguageCode.LanguageID", ondelete="RESTRICT"), nullable=False, index=True)
    UserName = Column(String(20), ForeignKey("User.UserName", ondelete="SET NULL"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("PoiID", "LanguageID", name="UQ_POITranslation_PoiID_LanguageID"),
    )

    poi = relationship("POI", back_populates="translations")
    language = relationship("LanguageCode")
    audio = relationship("POIAudio", back_populates="translation", uselist=False, cascade="all, delete-orphan")
