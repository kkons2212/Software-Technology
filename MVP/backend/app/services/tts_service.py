"""Orchestration for safe translation-audio regeneration."""

import logging
import uuid
from collections.abc import Callable
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.exceptions import ApiError
from app.integrations.edge_tts_client import EdgeTTSClient
from app.repositories.audio_repository import AudioRepository
from app.schemas.audio_schema import AudioRegenerationResponse

logger = logging.getLogger(__name__)


class TTSService:
    """Generate new audio outside database sessions and persist it atomically."""

    def __init__(
        self,
        session_factory: Callable[[], Session],
        audio_dir: Path,
        tts_client: EdgeTTSClient | None = None,
    ):
        self.session_factory = session_factory
        self.audio_dir = audio_dir
        self.tts_client = tts_client or EdgeTTSClient()

    async def regenerate_audio(self, stran_id: str) -> AudioRegenerationResponse:
        """Synthesize the translation and publish its new audio metadata."""
        with self.session_factory() as db:
            language_id, title, short_description, description = AudioRepository(
                db
            ).get_generation_text(stran_id)

        narration = "\n\n".join(
            part.strip()
            for part in (title, short_description, description)
            if part and part.strip()
        )
        if not narration:
            raise ApiError(
                status_code=422,
                code="EMPTY_TRANSLATION",
                message="Translation text is required to generate audio.",
            )

        try:
            self.audio_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            logger.exception("Unable to create audio directory %s", self.audio_dir)
            raise ApiError(
                status_code=500,
                code="AUDIO_STORAGE_UNAVAILABLE",
                message="Audio storage is unavailable. Please try again later.",
            ) from exc

        filename = f"translation_{uuid.uuid4().hex}.mp3"
        output_path = self.audio_dir / filename
        temporary_path = self.audio_dir / f".{filename}.tmp"
        audio_url = f"/static/audio/{filename}"

        try:
            await self.tts_client.generate_audio(
                narration,
                language_id,
                temporary_path,
            )
            if not temporary_path.is_file() or temporary_path.stat().st_size == 0:
                raise RuntimeError("Edge-TTS returned an empty audio file.")
        except Exception as exc:
            temporary_path.unlink(missing_ok=True)
            logger.exception("Audio regeneration failed for translation %s", stran_id)
            raise ApiError(
                status_code=502,
                code="AUDIO_GENERATION_FAILED",
                message="Unable to generate Audio Guide, please try again later.",
            ) from exc

        try:
            temporary_path.replace(output_path)
            file_size = output_path.stat().st_size
            with self.session_factory() as db:
                AudioRepository(db).save_generated_audio(
                    stran_id=stran_id,
                    audio_url=audio_url,
                    file_size=file_size,
                    expected_text=(title, short_description, description),
                )
        except ApiError:
            output_path.unlink(missing_ok=True)
            raise
        except Exception as exc:
            output_path.unlink(missing_ok=True)
            logger.exception(
                "Unable to store regenerated audio for translation %s", stran_id
            )
            raise ApiError(
                status_code=500,
                code="AUDIO_STORAGE_FAILED",
                message="Audio was generated but could not be saved. Please try again.",
            ) from exc
        finally:
            temporary_path.unlink(missing_ok=True)

        return AudioRegenerationResponse(
            stran_id=stran_id,
            status="DRAFT",
            audio_url=audio_url,
            audio_status="READY",
        )
