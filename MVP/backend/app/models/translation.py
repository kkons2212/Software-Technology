"""Localized POI content model."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class POITranslation(Base):
    __tablename__ = "POITranslation"

    stran_id: Mapped[str] = mapped_column("StranID", String(20), primary_key=True)
    title: Mapped[str] = mapped_column("Title", String(255), nullable=False)
    short_description: Mapped[str | None] = mapped_column(
        "Short_Description", String(255)
    )
    status: Mapped[str] = mapped_column(
        "Status", String(255), nullable=False, default="PENDING"
    )
    poi_id: Mapped[str] = mapped_column(
        "PoiID", ForeignKey("POI.PoiID", ondelete="CASCADE"), nullable=False
    )
    language_id: Mapped[str] = mapped_column(
        "LanguageID",
        ForeignKey("LanguageCode.LanguageID", ondelete="RESTRICT"),
        nullable=False,
    )
