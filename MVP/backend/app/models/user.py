"""SQLAlchemy ORM model for the `User` table (internal Administrator accounts).

US 02.1 - AC-02.1.1: multiple administrator accounts, no `role` column.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

USER_NAME_MAX_LENGTH = 20
EMAIL_MAX_LENGTH = 255
PASSWORD_HASH_MAX_LENGTH = 255
FULL_NAME_MAX_LENGTH = 255


class User(Base):
    """An internal Administrator account (every row is an Admin)."""

    __tablename__ = "User"

    user_name: Mapped[str] = mapped_column(
        "UserName", String(USER_NAME_MAX_LENGTH), primary_key=True
    )
    email: Mapped[str] = mapped_column(
        "Email", String(EMAIL_MAX_LENGTH), nullable=False, unique=True
    )
    password_hash: Mapped[str] = mapped_column(
        "Password_hash", String(PASSWORD_HASH_MAX_LENGTH), nullable=False
    )
    full_name: Mapped[str | None] = mapped_column(
        "FullName", String(FULL_NAME_MAX_LENGTH), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        "Is_Active", Boolean, nullable=False, default=True
    )
    falsed_attempts: Mapped[int] = mapped_column(
        "FalsedAttempts", Integer, nullable=False, default=0
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        "Lockeduntil", DateTime, nullable=True
    )
    create_at: Mapped[datetime] = mapped_column(
        "Create_at", DateTime, nullable=False, server_default=func.now()
    )
    update_at: Mapped[datetime] = mapped_column(
        "Update_at",
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
