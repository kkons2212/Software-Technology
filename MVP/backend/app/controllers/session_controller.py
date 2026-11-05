"""Visitor Session Controller (US 06.3).

Handles visitor session recovery across multiple devices and browsers.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import get_session_service
from app.core.session_restore_rate_limit import session_restore_rate_limiter
from app.schemas.session_schema import SessionRestoreRequest, SessionRestoreResponse
from app.services.session_service import SessionService

router = APIRouter(prefix="/api/v1/sessions", tags=["Visitor Sessions"])


@router.post(
    "/restore",
    response_model=SessionRestoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Restore a visitor session using its session code",
)
def restore_session(
    request: Request,
    payload: SessionRestoreRequest,
    session_service: SessionService = Depends(get_session_service),
) -> SessionRestoreResponse:
    """Validate and restore an unexpired 24-hour visiting session (TSK-06.3.1)."""
    client_ip = request.client.host if request.client else "unknown"
    retry_after = session_restore_rate_limiter.check(client_ip, payload.session_code)
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "SESSION_RESTORE_RATE_LIMITED",
                "message": "Too many restore attempts. Please try again later.",
                "details": None,
            },
            headers={"Retry-After": str(retry_after)},
        )

    return session_service.restore_session(session_code=payload.session_code)
