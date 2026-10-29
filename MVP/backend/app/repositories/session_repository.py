"""SessionRepository encapsulating SQLAlchemy ORM data access for VisitorSession (US 06.2)."""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.session import VisitorSession


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_session(
        self,
        session_code: str | None = None,
        session_token: str | None = None,
        preferred_language: str = "vi",
        expire_at: datetime | None = None,
        device_fingerprint: str | None = None,
    ) -> VisitorSession:
        """Create and persist a new 24-hour VisitorSession."""
        s_id = f"SES_{uuid.uuid4().hex[:12].upper()}"
        s_code = session_code or f"CCT-{uuid.uuid4().hex[:6].upper()}"
        s_token = session_token or uuid.uuid4().hex
        now = datetime.utcnow()
        expiry = expire_at or (now + timedelta(hours=24))

        session = VisitorSession(
            SessionID=s_id,
            SessionCode=s_code,
            SessionToken=s_token,
            DeviceFingerPrint=device_fingerprint,
            Status="ACTIVE",
            Activate_at=now,
            Expire_at=expiry,
            Create_at=now,
            PreferredLanguage=preferred_language,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_by_id(self, session_id: str) -> VisitorSession | None:
        """Retrieve a VisitorSession by primary key identifier."""
        return (
            self.db.query(VisitorSession)
            .filter(VisitorSession.SessionID == session_id)
            .first()
        )

    def get_by_code(self, session_code: str) -> VisitorSession | None:
        """Retrieve a VisitorSession by unique session code (e.g., CCT-XXXXXX)."""
        return (
            self.db.query(VisitorSession)
            .filter(VisitorSession.SessionCode == session_code.strip())
            .first()
        )

    def get_by_token(self, session_token: str) -> VisitorSession | None:
        """Retrieve a VisitorSession by bearer session token."""
        return (
            self.db.query(VisitorSession)
            .filter(VisitorSession.SessionToken == session_token.strip())
            .first()
        )

    def is_session_active(self, session_or_identifier: VisitorSession | str) -> bool:
        """Check whether a session is currently ACTIVE and has not expired."""
        if isinstance(session_or_identifier, VisitorSession):
            session = session_or_identifier
        else:
            identifier = session_or_identifier.strip()
            session = (
                self.db.query(VisitorSession)
                .filter(
                    or_(
                        VisitorSession.SessionCode == identifier,
                        VisitorSession.SessionToken == identifier,
                        VisitorSession.SessionID == identifier,
                    )
                )
                .first()
            )

        if not session:
            return False

        if session.Status != "ACTIVE":
            return False

        if session.Expire_at and session.Expire_at < datetime.utcnow():
            return False

        return True

    def expire_session(self, session_id_or_code: str) -> VisitorSession | None:
        """Mark an active session as EXPIRED."""
        identifier = session_id_or_code.strip()
        session = (
            self.db.query(VisitorSession)
            .filter(
                or_(
                    VisitorSession.SessionID == identifier,
                    VisitorSession.SessionCode == identifier,
                )
            )
            .first()
        )
        if session:
            session.Status = "EXPIRED"
            self.db.commit()
            self.db.refresh(session)
        return session

    def extend_session(
        self, session_id_or_code: str, hours: int = 24
    ) -> VisitorSession | None:
        """Extend expiration time for a session by specified hours."""
        identifier = session_id_or_code.strip()
        session = (
            self.db.query(VisitorSession)
            .filter(
                or_(
                    VisitorSession.SessionID == identifier,
                    VisitorSession.SessionCode == identifier,
                )
            )
            .first()
        )
        if session:
            now = datetime.utcnow()
            base_time = (
                session.Expire_at
                if session.Expire_at and session.Expire_at > now
                else now
            )
            session.Expire_at = base_time + timedelta(hours=hours)
            session.Status = "ACTIVE"
            self.db.commit()
            self.db.refresh(session)
        return session
