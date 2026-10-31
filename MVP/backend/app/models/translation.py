"""SQLAlchemy model for POITranslation table."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Numeric,
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


class _AudioProxy:
    """Compatibility proxy presenting audio metadata from POITranslation."""

    def __init__(self, translation: "POITranslation"):
        self._t = translation

    @property
    def audio_id(self) -> str:
        return f"AUD_{self._t.stran_id}"

    @property
    def audio_url(self) -> str | None:
        return self._t.audio_url

    @audio_url.setter
    def audio_url(self, value: str | None) -> None:
        self._t.audio_url = value

    @property
    def duration(self) -> Decimal | None:
        return self._t.duration

    @duration.setter
    def duration(self, value: Decimal | None) -> None:
        self._t.duration = value

    @property
    def file_size(self) -> int | None:
        return self._t.file_size

    @file_size.setter
    def file_size(self, value: int | None) -> None:
        self._t.file_size = value

    @property
    def status(self) -> str:
        return "READY" if self._t.audio_url else "PENDING"

    @status.setter
    def status(self, value: str) -> None:
        pass


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
    audio_url: Mapped[str | None] = mapped_column("Audio_url", Text, nullable=True)
    duration: Mapped[Decimal | None] = mapped_column(
        "Duration", Numeric(6, 1), nullable=True
    )
    file_size: Mapped[int | None] = mapped_column(
        "File_size", BigInteger, nullable=True
    )
    audio_url: Mapped[str | None] = mapped_column("Audio_url", Text, nullable=True)
    duration: Mapped[Decimal | None] = mapped_column(
        "Duration", Numeric(6, 1), nullable=True
    )
    file_size: Mapped[int | None] = mapped_column(
        "File_size", BigInteger, nullable=True
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
        "Review_by",
        String(20),
        ForeignKey("User.UserName", ondelete="RESTRICT"),
        nullable=True,
        index=True,
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

    StranID = synonym("stran_id")
    Title = synonym("title")
    Short_Description = synonym("short_description")
    Description = synonym("description")
    Status = synonym("status")
    Audio_url = synonym("audio_url")
    Duration = synonym("duration")
    File_size = synonym("file_size")
    Review_at = synonym("review_at")
    Create_at = synonym("create_at")
    Update_at = synonym("update_at")
    Review_by = synonym("review_by")
    PoiID = synonym("poi_id")
    LanguageID = synonym("language_id")

    __table_args__ = (
        UniqueConstraint(
            "PoiID", "LanguageID", name="UQ_POITranslation_PoiID_LanguageID"
        ),
        {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    poi = relationship("POI", back_populates="translations")
    language = relationship("LanguageCode")

    @property
    def user_name(self) -> str | None:
        """Backward compatibility alias for review_by."""
        return self.review_by

    @user_name.setter
    def user_name(self, value: str | None) -> None:
        self.review_by = value

    @property
    def audio(self) -> _AudioProxy | None:
        """Compatibility accessor returning audio metadata as proxy."""
        if self.audio_url is not None:
            return _AudioProxy(self)
        return None
