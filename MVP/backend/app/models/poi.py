"""SQLAlchemy model for POI (Points of Interest / Exhibition Points) table."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class POI(Base):
    __tablename__ = "POI"

    PoiID = Column(String(20), primary_key=True, index=True)
    Title = Column(String(255), nullable=False)
    Short_Description = Column(String(255), nullable=True)
    Description = Column(Text, nullable=True)
    Image_Url = Column(String(255), nullable=True)
    Latitude = Column(Numeric(10, 7), nullable=False)
    Longitude = Column(Numeric(10, 7), nullable=False)
    Radius = Column(Integer, nullable=False, default=30)
    Is_Active = Column(Boolean, nullable=False, default=True)
    Create_at = Column(DateTime, nullable=False, default=func.now())
    Update_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    Create_by = Column(String(20), ForeignKey("User.UserName", ondelete="SET NULL"), nullable=True, index=True)

    creator = relationship("User")
    translations = relationship("POITranslation", back_populates="poi", cascade="all, delete-orphan")
