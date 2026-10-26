"""Supported language catalog model."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LanguageCode(Base):
    __tablename__ = "LanguageCode"

    language_id: Mapped[str] = mapped_column("LanguageID", String(20), primary_key=True)
    language_name: Mapped[str] = mapped_column(
        "LanguageName", String(255), nullable=False
    )
