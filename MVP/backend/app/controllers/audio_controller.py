"""Audio Streaming Controller (US 06.4).

Enforces 24-hour visiting session authorization before streaming POI audio narrations.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query
from fastapi.responses import FileResponse

from app.core.dependencies import get_audio_service
from app.services.audio_service import AudioService

router = APIRouter(prefix="/api/v1/audio", tags=["Audio Streaming & Paywall"])


def _extract_token(
    token: str | None = None,
    x_session_token: str | None = None,
    authorization: str | None = None,
) -> str | None:
    """Extract session token from query param, X-Session-Token header, or Bearer auth header."""
    if token and token.strip():
        return token.strip()
    if x_session_token and x_session_token.strip():
        return x_session_token.strip()
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization[7:].strip()
        if bearer_token:
            return bearer_token
    return None


@router.get(
    "/{poi_id}",
    summary="Stream POI audio narration (Requires active 24h session)",
)
def stream_poi_audio(
    poi_id: str,
    language: Annotated[str, Query(description="Target language code")] = "vi",
    token: Annotated[str | None, Query(description="Session token")] = None,
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
    authorization: Annotated[str | None, Header()] = None,
    audio_service: AudioService = Depends(get_audio_service),
) -> FileResponse:
    """Stream protected audio file for an exhibit. Rejects unpaid/expired with HTTP 403 (TSK-06.4.1)."""
    session_token = _extract_token(token, x_session_token, authorization)
    file_path = audio_service.get_audio_file_for_poi(
        poi_id=poi_id,
        language=language,
        session_token=session_token,
    )
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes"},
    )


@router.get(
    "/stream/{poi_id}",
    summary="Stream POI audio narration alias",
    include_in_schema=False,
)
def stream_poi_audio_alias(
    poi_id: str,
    language: Annotated[str, Query()] = "vi",
    token: Annotated[str | None, Query()] = None,
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
    authorization: Annotated[str | None, Header()] = None,
    audio_service: AudioService = Depends(get_audio_service),
) -> FileResponse:
    return stream_poi_audio(
        poi_id=poi_id,
        language=language,
        token=token,
        x_session_token=x_session_token,
        authorization=authorization,
        audio_service=audio_service,
    )
