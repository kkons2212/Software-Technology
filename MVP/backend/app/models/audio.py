"""SQLAlchemy model for POIAudio narration table."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.core.database import Base


class POIAudio(Base):
    __tablename__ = "POIAudio"

    audio_id: Mapped[str] = mapped_column(
        "AudioID", String(20), primary_key=True, index=True
    )
    audio_url: Mapped[str] = mapped_column("Audio_url", Text, nullable=False)
    duration: Mapped[Decimal | None] = mapped_column(
        "Duration", Numeric(6, 1), nullable=True
    )
    file_size: Mapped[int | None] = mapped_column(
        "File_size", BigInteger, nullable=True
    )
    status: Mapped[str] = mapped_column(
        "Status", String(255), nullable=False, default="READY"
    )
    create_at: Mapped[datetime] = mapped_column(
        "Create_at", DateTime, nullable=False, default=func.now()
    )
    update_at: Mapped[datetime] = mapped_column(
        "Update_at", DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    stran_id: Mapped[str] = mapped_column(
        "StranID",
        ForeignKey("POITranslation.StranID", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    AudioID = synonym("audio_id")
    Audio_url = synonym("audio_url")
    Duration = synonym("duration")
    File_size = synonym("file_size")
    Status = synonym("status")
    Create_at = synonym("create_at")
    Update_at = synonym("update_at")
    StranID = synonym("stran_id")

    translation = relationship("POITranslation", back_populates="audio")
