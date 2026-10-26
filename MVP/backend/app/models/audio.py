"""SQLAlchemy model for POIAudio narration table."""

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class POIAudio(Base):
    __tablename__ = "POIAudio"

    AudioID = Column(String(20), primary_key=True, index=True)
    Audio_url = Column(Text, nullable=False)
    Duration = Column(Numeric(6, 1), nullable=True)
    File_size = Column(BigInteger, nullable=True)
    Status = Column(String(255), nullable=False, default="READY")
    Create_at = Column(DateTime, nullable=False, default=func.now())
    Update_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    StranID = Column(String(20), ForeignKey("POITranslation.StranID", ondelete="CASCADE"), nullable=False, index=True)

    translation = relationship("POITranslation", back_populates="audio")
