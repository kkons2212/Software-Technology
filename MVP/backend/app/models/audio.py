"""Published narration audio model."""

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class POIAudio(Base):
    __tablename__ = "POIAudio"

    audio_id: Mapped[str] = mapped_column("AudioID", String(20), primary_key=True)
    audio_url: Mapped[str] = mapped_column("Audio_url", Text, nullable=False)
    status: Mapped[str] = mapped_column(
        "Status", String(255), nullable=False, default="READY"
    )
    stran_id: Mapped[str] = mapped_column(
        "StranID",
        ForeignKey("POITranslation.StranID", ondelete="CASCADE"),
        nullable=False,
    )
