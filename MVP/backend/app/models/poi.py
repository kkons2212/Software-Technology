"""Point of interest model."""

from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class POI(Base):
    __tablename__ = "POI"

    poi_id: Mapped[str] = mapped_column("PoiID", String(20), primary_key=True)
    title: Mapped[str] = mapped_column("Title", String(255), nullable=False)
    short_description: Mapped[str | None] = mapped_column(
        "Short_Description", String(255)
    )
    image_url: Mapped[str | None] = mapped_column("Image_Url", String(255))
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
