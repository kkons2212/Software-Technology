"""SQLAlchemy model for POITranslation table."""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.core.database import Base

TRANSLATION_STATUS_PENDING = "PENDING"
TRANSLATION_STATUS_DRAFT = "DRAFT"
TRANSLATION_STATUS_NEEDS_UPDATE = "NEEDS_UPDATE"
TRANSLATION_STATUS_PUBLISHED = "PUBLISHED"
TRANSLATION_STATUS_FAILED = "FAILED"


class POITranslation(Base):
    __tablename__ = "POITranslation"

    stran_id: Mapped[str] = mapped_column(
        "StranID", String(20), primary_key=True, index=True
    )
    title: Mapped[str] = mapped_column("Title", String(255), nullable=False)
    short_description: Mapped[str | None] = mapped_column(
        "Short_Description", String(255), nullable=True
    )
    description: Mapped[str | None] = mapped_column("Description", Text, nullable=True)
    status: Mapped[str] = mapped_column(
        "Status",
        String(255),
        nullable=False,
        default=TRANSLATION_STATUS_PENDING,
        index=True,
    )
    review_at: Mapped[datetime | None] = mapped_column(
        "Review_at", DateTime, nullable=True
    )
    create_at: Mapped[datetime] = mapped_column(
        "Create_at", DateTime, nullable=False, default=func.now()
    )
    update_at: Mapped[datetime] = mapped_column(
        "Update_at", DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    review_by: Mapped[str | None] = mapped_column(
        "Review_by", String(20), nullable=True
    )
    poi_id: Mapped[str] = mapped_column(
        "PoiID",
        String(20),
        ForeignKey("POI.PoiID", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language_id: Mapped[str] = mapped_column(
        "LanguageID",
        String(20),
        ForeignKey("LanguageCode.LanguageID", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_name: Mapped[str | None] = mapped_column(
        "UserName",
        String(20),
        ForeignKey("User.UserName", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    StranID = synonym("stran_id")
    Title = synonym("title")
    Short_Description = synonym("short_description")
    Description = synonym("description")
    Status = synonym("status")
    Review_at = synonym("review_at")
    Create_at = synonym("create_at")
    Update_at = synonym("update_at")
    Review_by = synonym("review_by")
    PoiID = synonym("poi_id")
    LanguageID = synonym("language_id")
    UserName = synonym("user_name")

    __table_args__ = (
        UniqueConstraint(
            "PoiID", "LanguageID", name="UQ_POITranslation_PoiID_LanguageID"
        ),
    )

    poi = relationship("POI", back_populates="translations")
    language = relationship("LanguageCode")
    audio = relationship(
        "POIAudio",
        back_populates="translation",
        uselist=False,
        cascade="all, delete-orphan",
    )
