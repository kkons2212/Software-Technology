"""Visitor Session Controller (US 06.3).

Handles visitor session recovery across multiple devices and browsers.
"""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_session_service
from app.schemas.session_schema import SessionRestoreRequest, SessionRestoreResponse
from app.services.session_service import SessionService

router = APIRouter(prefix="/api/v1/sessions", tags=["Visitor Sessions"])


@router.post(
    "/restore",
    response_model=SessionRestoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Restore a visitor session using a 6-character session code",
)
def restore_session(
    payload: SessionRestoreRequest,
    session_service: SessionService = Depends(get_session_service),
) -> SessionRestoreResponse:
    """Validate and restore an unexpired 24-hour visiting session (TSK-06.3.1)."""
    return session_service.restore_session(session_code=payload.session_code)
