"""SQLAlchemy model for POI (Points of Interest / Exhibition Points) table."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.core.database import Base


class POI(Base):
    __tablename__ = "POI"

    poi_id: Mapped[str] = mapped_column(
        "PoiID", String(20), primary_key=True, index=True
    )
    title: Mapped[str] = mapped_column("Title", String(255), nullable=False)
    short_description: Mapped[str | None] = mapped_column(
        "Short_Description", String(255), nullable=True
    )
    description: Mapped[str | None] = mapped_column("Description", Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(
        "Image_Url", String(255), nullable=True
    )
    latitude: Mapped[Decimal] = mapped_column(
        "Latitude", Numeric(10, 7), nullable=False
    )
    longitude: Mapped[Decimal] = mapped_column(
        "Longitude", Numeric(10, 7), nullable=False
    )
    radius: Mapped[int] = mapped_column("Radius", Integer, nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(
        "Is_Active", Boolean, nullable=False, default=True
    )
    create_at: Mapped[datetime] = mapped_column(
        "Create_at", DateTime, nullable=False, default=func.now()
    )
    update_at: Mapped[datetime] = mapped_column(
        "Update_at", DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    create_by: Mapped[str | None] = mapped_column(
        "Create_by",
        String(20),
        ForeignKey("User.UserName", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    PoiID = synonym("poi_id")
    Title = synonym("title")
    Short_Description = synonym("short_description")
    Description = synonym("description")
    Image_Url = synonym("image_url")
    Latitude = synonym("latitude")
    Longitude = synonym("longitude")
    Radius = synonym("radius")
    Is_Active = synonym("is_active")
    Create_at = synonym("create_at")
    Update_at = synonym("update_at")
    Create_by = synonym("create_by")

    creator = relationship("User")
    translations = relationship(
        "POITranslation", back_populates="poi", cascade="all, delete-orphan"
    )
