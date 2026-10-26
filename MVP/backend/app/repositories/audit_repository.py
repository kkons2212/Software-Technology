"""Repository for `Audit` persistence: authentication and action logging.

US 02.1 - TSK-02.1.3. Contains no business rules and never raises HTTP
exceptions; the caller decides the HTTP outcome.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.audit import Audit

AUDIT_ID_PREFIX = "AUD"
AUDIT_ID_RANDOM_LENGTH = 16


class AuditRepository:
    """Encapsulates every ORM operation against the `Audit` table."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def generate_audit_id(self) -> str:
        """Build a 20-character audit identifier (`AUD-` + 16 hex characters)."""
        return f"{AUDIT_ID_PREFIX}-{uuid.uuid4().hex[:AUDIT_ID_RANDOM_LENGTH]}"

    def create_log_entry(
        self,
        user_name: str,
        status: str,
        ip_address: str | None = None,
        details: str | None = None,
    ) -> Audit:
        """Insert one audit row and return it refreshed with the DB timestamp."""
        log_entry = Audit(
            audit_id=self.generate_audit_id(),
            user_name=user_name,
            status=status,
            ip_address=ip_address,
            details=details,
        )
        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)
        return log_entry
