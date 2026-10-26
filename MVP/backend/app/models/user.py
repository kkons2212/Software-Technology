"""SQLAlchemy model for User table (Strict 2-Actor Model: All accounts are Administrators)."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from app.core.database import Base


class User(Base):
    __tablename__ = "User"

    UserName = Column(String(20), primary_key=True, index=True)
    Email = Column(String(255), unique=True, nullable=False, index=True)
    Password_hash = Column(String(255), nullable=False)
    FullName = Column(String(255), nullable=True)
    Is_Active = Column(Boolean, nullable=False, default=True)
    FalsedAttempts = Column(Integer, nullable=False, default=0)
    Lockeduntil = Column(DateTime, nullable=True)
    Create_at = Column(DateTime, nullable=False, default=func.now())
    Update_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
