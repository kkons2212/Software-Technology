"""Persistence operations for generated POI narration audio."""

import time
import uuid

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError
from app.models.audio import AUDIO_STATUS_FAILED, AUDIO_STATUS_READY, POIAudio
from app.models.translation import POITranslation


class AudioRepository:
    """Persist audio metadata and synchronize translation review status."""

    def __init__(self, db: Session):
        self.db = db

    def get_generation_text(
        self, stran_id: str
    ) -> tuple[str, str, str | None, str | None]:
        """Return the target text needed for TTS without retaining ORM objects."""
        translation = (
            self.db.query(POITranslation)
            .filter(POITranslation.stran_id == stran_id)
            .first()
        )
        if translation is None:
            raise ApiError(
                status_code=404,
                code="TRANSLATION_NOT_FOUND",
                message=f"Translation '{stran_id}' not found.",
            )
        return (
            translation.language_id,
            translation.title,
            translation.short_description,
            translation.description,
        )

    def save_generated_audio(
        self,
        stran_id: str,
        audio_url: str,
        file_size: int,
        expected_text: tuple[str, str | None, str | None],
    ) -> None:
        """Atomically store new audio metadata and unlock the draft for review."""
        translation = (
            self.db.query(POITranslation)
            .filter(POITranslation.stran_id == stran_id)
            .with_for_update()
            .first()
        )
        if translation is None:
            raise ApiError(
                status_code=404,
                code="TRANSLATION_NOT_FOUND",
                message=f"Translation '{stran_id}' not found.",
            )
        current_text = (
            translation.title,
            translation.short_description,
            translation.description,
        )
        if current_text != expected_text:
            raise ApiError(
                status_code=409,
                code="TRANSLATION_CHANGED",
                message=(
                    "Translation text changed during audio generation. "
                    "Please regenerate the audio again."
                ),
            )

        audio = (
            self.db.query(POIAudio)
            .filter(POIAudio.stran_id == stran_id)
            .with_for_update()
            .first()
        )
        if audio is None:
            self.db.add(
                POIAudio(
                    audio_id=f"AUD_{uuid.uuid4().hex[:16]}",
                    stran_id=stran_id,
                    audio_url=audio_url,
                    file_size=file_size,
                    status=AUDIO_STATUS_READY,
                )
            )
        else:
            audio.audio_url = audio_url
            audio.file_size = file_size
            audio.status = AUDIO_STATUS_READY
            audio.update_at = func.now()

        translation.status = "DRAFT"
        translation.update_at = func.now()
        self.db.commit()

    def upsert_audio(
        self,
        stran_id: str,
        audio_url: str,
        file_size: int,
        status: str = AUDIO_STATUS_READY,
    ) -> POIAudio:
        """Upsert audio record for a translation (US 04.4 pipeline)."""
        audio = self.db.query(POIAudio).filter(POIAudio.stran_id == stran_id).first()
        if audio is None:
            audio = POIAudio(
                audio_id=f"AUD_{uuid.uuid4().hex[:16]}",
                stran_id=stran_id,
                audio_url=audio_url,
                file_size=file_size,
                status=status,
            )
            self.db.add(audio)
        else:
            audio.audio_url = audio_url
            audio.file_size = file_size
            audio.status = status
            audio.update_at = func.now()
        self.db.commit()
        self.db.refresh(audio)
        return audio

    def set_audio_failed(self, stran_id: str) -> None:
        """Mark audio status as FAILED when TTS synthesis fails."""
        audio = self.db.query(POIAudio).filter(POIAudio.stran_id == stran_id).first()
        if audio is None:
            audio = POIAudio(
                audio_id=f"AUD_{uuid.uuid4().hex[:16]}",
                stran_id=stran_id,
                audio_url="",
                status=AUDIO_STATUS_FAILED,
            )
            self.db.add(audio)
        else:
            audio.status = AUDIO_STATUS_FAILED
            audio.update_at = func.now()
        self.db.commit()

    def get_all_audio_urls(self) -> set[str]:
        """Return the set of all active audio URLs referenced in the database."""
        rows = self.db.query(POIAudio.audio_url).all()
        return {r[0] for r in rows if r[0]}

    def ping_database(self) -> float:
        """Measure database connection round-trip latency in milliseconds."""
        start = time.perf_counter()
        self.db.execute(text("SELECT 1"))
        return round((time.perf_counter() - start) * 1000, 2)
