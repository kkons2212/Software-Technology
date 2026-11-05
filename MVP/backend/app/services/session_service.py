"""SessionService encapsulating business logic for visitor sessions (US 06.2, US 06.3)."""

from datetime import datetime

from app.core.exceptions import ApiError
from app.repositories.session_repository import SessionRepository
from app.schemas.session_schema import SessionRestoreData, SessionRestoreResponse


class SessionService:
    """Service layer managing visitor session lifecycles, recovery, and access validation."""

    def __init__(self, session_repository: SessionRepository) -> None:
        self.session_repo = session_repository

    def restore_session(self, session_code: str) -> SessionRestoreResponse:
        """Validate and restore a 24-hour visiting session using a session code adhering to SISE.

        Phase 1: Precondition Gate (Code normalization & existence verification)
        Phase 2: Linear Compute & Validation (Expiry check & token guarantee)
        Phase 3: Unified Exit (DTO construction and single return)
        """
        # Phase 1: Precondition Gate
        code = session_code.strip().upper()
        if not code.startswith("CCT-") and len(code) in {6, 32}:
            code = f"CCT-{code}"

        session = self.session_repo.get_by_code(code)
        if not session:
            raise ApiError(
                status_code=404,
                code="SESSION_NOT_FOUND",
                message="Session code is invalid or has expired.",
            )

        # Phase 2: Linear Compute & Validation
        now = datetime.utcnow()
        if session.Status != "ACTIVE" or (
            session.Expire_at and session.Expire_at <= now
        ):
            raise ApiError(
                status_code=404,
                code="SESSION_NOT_FOUND",
                message="Session code is invalid or has expired.",
            )

        # Guarantee session token without violating L2/L3 layering boundaries
        resolved_token = self.session_repo.ensure_session_token(session)
        remaining_seconds = max(0, int((session.Expire_at - now).total_seconds()))

        # Phase 3: Unified Structured Exit
        data = SessionRestoreData(
            session_id=session.SessionID,
            session_code=session.SessionCode,
            session_token=resolved_token,
            status=session.Status,
            expires_at=session.Expire_at,
            remaining_seconds=remaining_seconds,
            preferred_language=session.PreferredLanguage or "vi",
        )

        response = SessionRestoreResponse(
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
        return response

    def validate_session_active(self, token: str) -> bool:
        """Deterministic predicate checking whether a session token is currently valid."""
        cleaned_token = str(token).strip() if token else ""
        is_active = (
            self.session_repo.is_session_active(cleaned_token)
            if cleaned_token
            else False
        )
        return is_active
