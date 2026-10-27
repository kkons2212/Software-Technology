"""SQLAlchemy ORM model for the `Audit` table (authentication & action trail).

US 02.1 - TSK-02.1.3: every login attempt is recorded with the client IP.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

AUDIT_ID_MAX_LENGTH = 20
AUDIT_STATUS_MAX_LENGTH = 255
AUDIT_IP_ADDRESS_MAX_LENGTH = 45
AUDIT_DETAILS_MAX_LENGTH = 255
AUDIT_USER_NAME_MAX_LENGTH = 20

# Standardized UPPERCASE audit status values (dev_rules Section 4.1).
AUDIT_STATUS_SUCCESS = "SUCCESS"
AUDIT_STATUS_FAILED = "FAILED"
AUDIT_STATUS_LOCKED = "LOCKED"


class Audit(Base):
    """An immutable audit log row describing one administrator action."""

    __tablename__ = "Audit"

    audit_id: Mapped[str] = mapped_column(
        "AuditID", String(AUDIT_ID_MAX_LENGTH), primary_key=True
    )
    status: Mapped[str] = mapped_column(
        "Status", String(AUDIT_STATUS_MAX_LENGTH), nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(
        "Ip_address", String(AUDIT_IP_ADDRESS_MAX_LENGTH), nullable=True
    )
    details: Mapped[str | None] = mapped_column(
        "Details", String(AUDIT_DETAILS_MAX_LENGTH), nullable=True
    )
    create_at: Mapped[datetime] = mapped_column(
        "Create_at", DateTime, nullable=False, server_default=func.now()
    )
    user_name: Mapped[str] = mapped_column(
        "UserName",
        String(AUDIT_USER_NAME_MAX_LENGTH),
        ForeignKey("User.UserName", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
