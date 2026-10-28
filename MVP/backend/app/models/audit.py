"""SQLAlchemy ORM model for the `Audit` table (authentication & action trail)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.core.database import Base

AUDIT_ID_MAX_LENGTH = 20
AUDIT_STATUS_MAX_LENGTH = 255
AUDIT_IP_ADDRESS_MAX_LENGTH = 45
AUDIT_DETAILS_MAX_LENGTH = 255
AUDIT_USER_NAME_MAX_LENGTH = 20

AUDIT_STATUS_SUCCESS = "SUCCESS"
AUDIT_STATUS_FAILED = "FAILED"
AUDIT_STATUS_LOCKED = "LOCKED"

# US 02.3: the `Details` marker of the audit row that acts as the session
# revocation watermark. It lives in the model layer because both the repository
# (which reads the watermark) and the service (which writes it) need it, and a
# repository must never import from `services/`.
AUDIT_DETAILS_LOGOUT = "ADMIN_LOGOUT"


class Audit(Base):
    """An immutable audit log row describing one administrator action."""

    __tablename__ = "Audit"

    audit_id: Mapped[str] = mapped_column(
        "AuditID", String(AUDIT_ID_MAX_LENGTH), primary_key=True, index=True
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
        "Create_at", DateTime, nullable=False, server_default=func.now(), index=True
    )
    user_name: Mapped[str] = mapped_column(
        "UserName",
        String(AUDIT_USER_NAME_MAX_LENGTH),
        ForeignKey("User.UserName", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    AuditID = synonym("audit_id")
    Status = synonym("status")
    Ip_address = synonym("ip_address")
    Details = synonym("details")
    Create_at = synonym("create_at")
    UserName = synonym("user_name")

    user = relationship("User")
