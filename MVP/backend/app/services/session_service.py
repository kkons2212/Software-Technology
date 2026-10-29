"""SessionService encapsulating business logic for visitor sessions (US 06.2, US 06.3)."""

import uuid
from datetime import datetime

from app.core.exceptions import ApiError
from app.repositories.session_repository import SessionRepository
from app.schemas.session_schema import SessionRestoreData, SessionRestoreResponse


class SessionService:
    """Service layer managing visitor session lifecycles, recovery, and access validation."""

    def __init__(self, session_repository: SessionRepository) -> None:
        self.session_repo = session_repository

    def restore_session(self, session_code: str) -> SessionRestoreResponse:
        """Validate and restore a 24-hour visiting session using a session code (TSK-06.3.1).

        Raises:
            ApiError(404): If the session code does not exist.
            ApiError(410): If the session exists but has expired or is inactive.
        """
        code = session_code.strip().upper()
        if not code.startswith("CCT-") and len(code) == 6:
            code = f"CCT-{code}"

        session = self.session_repo.get_by_code(code)

        if not session:
            raise ApiError(
                status_code=404,
                code="SESSION_NOT_FOUND",
                message="Session code is invalid or has expired.",
                details={"session_code": code},
            )

        now = datetime.utcnow()

        if session.Status != "ACTIVE" or (
            session.Expire_at and session.Expire_at <= now
        ):
            raise ApiError(
                status_code=410,
                code="SESSION_EXPIRED",
                message="Session code is invalid or has expired.",
                details={
                    "session_code": code,
                    "status": session.Status,
                    "expired_at": (
                        session.Expire_at.isoformat() if session.Expire_at else None
                    ),
                },
            )

        # Ensure session token exists
        if not session.SessionToken:
            session.SessionToken = uuid.uuid4().hex
            self.session_repo.db.commit()
            self.session_repo.db.refresh(session)

        remaining_seconds = max(0, int((session.Expire_at - now).total_seconds()))

        data = SessionRestoreData(
            session_id=session.SessionID,
            session_code=session.SessionCode,
            session_token=session.SessionToken,
            status=session.Status,
            expires_at=session.Expire_at,
            remaining_seconds=remaining_seconds,
            preferred_language=session.PreferredLanguage or "vi",
        )

        return SessionRestoreResponse(
            session_id=data.session_id,
            session_code=data.session_code,
            session_token=data.session_token,
            status=data.status,
            expires_at=data.expires_at,
            remaining_seconds=data.remaining_seconds,
            preferred_language=data.preferred_language,
            success=True,
            data=data,
        )
