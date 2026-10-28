"""AuditRepository for recording administrative actions and security telemetry."""

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.audit import AUDIT_DETAILS_LOGOUT, Audit

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

    def find_last_logout_at(self, user_name: str) -> datetime | None:
        """Return the timestamp of the most recent logout recorded for a user.

        US 02.3 - AC-02.3.1: deleting the cookie cannot invalidate a JWT that is
        still cryptographically valid, so the newest logout row is used as the
        revocation watermark that every token's issued-at claim is compared to.
        Both `UserName` and `Create_at` are indexed, so this stays a single
        indexed read on the authentication hot path.
        """
        return (
            self.db.query(func.max(Audit.create_at))
            .filter(
                Audit.user_name == user_name,
                Audit.details == AUDIT_DETAILS_LOGOUT,
            )
            .scalar()
        )

    def log_action(
        self,
        username: str,
        status: str,
        ip_address: str | None = None,
        details: Any | None = None,
    ) -> Audit:
        """Create an audit trail entry for administrator operations."""
        details_str = (
            json.dumps(details)
            if isinstance(details, dict | list)
            else (str(details) if details else None)
        )
        return self.create_log_entry(
            user_name=username,
            status=status,
            ip_address=ip_address,
            details=details_str[:255] if details_str else None,
        )
