"""AuditRepository for recording administrative actions and security telemetry."""

import json
import uuid
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit import Audit


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        username: str,
        status: str,
        ip_address: Optional[str] = None,
        details: Optional[Any] = None
    ) -> Audit:
        """Create an audit trail entry for administrator operations."""
        details_str = json.dumps(details) if isinstance(details, (dict, list)) else (str(details) if details else None)
        audit_entry = Audit(
            AuditID=f"AUD_{uuid.uuid4().hex[:12].upper()}",
            Status=status,
            Ip_address=ip_address,
            Details=details_str[:255] if details_str else None,
            UserName=username
        )
        self.db.add(audit_entry)
        self.db.commit()
        self.db.refresh(audit_entry)
        return audit_entry
