"""AudioService managing streaming authorization and audio delivery (US 06.4)."""

import logging
from pathlib import Path

from app.core.config import Settings, get_settings
from app.core.exceptions import ApiError
from app.repositories.audio_repository import AudioRepository
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)


class AudioService:
    """Manages audio streaming authorization and file retrieval."""

    def __init__(
        self,
        audio_repository: AudioRepository,
        session_repository: SessionRepository,
        audio_dir: Path | None = None,
        settings: Settings | None = None,
    ):
        self.audio_repository = audio_repository
        self.session_repository = session_repository
        self.settings = settings or get_settings()
        self.audio_dir = (
            audio_dir
            if audio_dir is not None
            else Path(self.settings.STATIC_DIR) / "audio"
        )
        self.audio_dir.mkdir(parents=True, exist_ok=True)

    def verify_streaming_access(self, session_token: str | None) -> None:
        """Enforce active 24-hour visitor session.

        Raises ApiError(403, 'CONTENT_LOCKED') if token is missing or expired.
        """
        if not session_token or not session_token.strip():
            logger.warning("Streaming access denied: Missing session token.")
            raise ApiError(
                status_code=403,
                code="CONTENT_LOCKED",
                message="Visiting session required or expired. Please purchase digital admission pass.",
            )

        clean_token = session_token.strip()
        if not self.session_repository.is_session_active(clean_token):
            logger.warning("Streaming access denied: Invalid or expired session token.")
            raise ApiError(
                status_code=403,
                code="CONTENT_LOCKED",
                message="Visiting session required or expired. Please purchase digital admission pass.",
            )

    def get_audio_file_for_poi(
        self,
        poi_id: str,
        language: str = "vi",
        session_token: str | None = None,
    ) -> Path:
        """Authorize and resolve the physical audio file path for a POI and language."""
        self.verify_streaming_access(session_token)

        audio = self.audio_repository.get_audio_by_poi_and_language(
            poi_id=poi_id, language_id=language
        )
        if not audio or not audio.audio_url:
            logger.warning(
                "Audio record not found for POI '%s' and language '%s'.",
                poi_id,
                language,
            )
            raise ApiError(
                status_code=404,
                code="AUDIO_NOT_FOUND",
                message=f"Audio narration for POI '{poi_id}' in language '{language}' not found.",
            )

        filename = Path(audio.audio_url).name
        file_path = self.audio_dir / filename

        if not file_path.exists():
            logger.warning("Physical audio file '%s' not found on disk.", file_path)
            raise ApiError(
                status_code=404,
                code="AUDIO_FILE_MISSING",
                message=f"Audio narration file for POI '{poi_id}' is missing from server storage.",
            )

        return file_path
