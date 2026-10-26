"""SQLAlchemy model for LanguageCode catalog table."""

from sqlalchemy import Column, String

from app.core.database import Base


class LanguageCode(Base):
    __tablename__ = "LanguageCode"

    LanguageID = Column(String(20), primary_key=True)
    LanguageName = Column(String(255), nullable=False)
