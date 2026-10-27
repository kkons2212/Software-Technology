"""SQLAlchemy model for LanguageCode catalog table."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, synonym

from app.core.database import Base


class LanguageCode(Base):
    __tablename__ = "LanguageCode"

    language_id: Mapped[str] = mapped_column("LanguageID", String(20), primary_key=True)
    language_name: Mapped[str] = mapped_column(
        "LanguageName", String(255), nullable=False
    )

    LanguageID = synonym("language_id")
    LanguageName = synonym("language_name")
