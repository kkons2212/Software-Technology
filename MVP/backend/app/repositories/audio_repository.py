"""Persistence operations for generated POI narration audio."""

import time

from sqlalchemy import func
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
        if not stran_id:
            raise ApiError(
                status_code=404,
                code="TRANSLATION_NOT_FOUND",
                message="Translation ID is required.",
            )

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
        """Atomically store new audio metadata on POITranslation and unlock the draft for review."""
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

        translation.audio_url = audio_url
        translation.file_size = file_size
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
        translation = (
            self.db.query(POITranslation)
            .filter(POITranslation.stran_id == stran_id)
            .first()
        )
        valid_statuses = {"PENDING", "DRAFT", "NEEDS_UPDATE", "PUBLISHED", "FAILED"}
        target_status = status if status in valid_statuses else "DRAFT"

        if translation is not None:
            translation.audio_url = audio_url
            translation.file_size = file_size
            translation.status = target_status
            translation.update_at = func.now()
            self.db.commit()
            self.db.refresh(translation)

        return POIAudio(
            stran_id=stran_id,
            audio_url=audio_url,
            file_size=file_size,
            status=status,
        )

    def set_audio_failed(self, stran_id: str) -> None:
        """Mark audio status as FAILED when TTS synthesis fails."""
        translation = (
            self.db.query(POITranslation)
            .filter(POITranslation.stran_id == stran_id)
            .first()
        )
        if translation is not None:
            translation.status = AUDIO_STATUS_FAILED
            translation.update_at = func.now()
            self.db.commit()

    def get_all_audio_urls(self) -> set[str]:
        """Return the set of all active audio URLs referenced in the database."""
        rows = (
            self.db.query(POITranslation.audio_url)
            .filter(POITranslation.audio_url.is_not(None))
            .all()
        )
        return {r[0] for r in rows if r[0]}

    def get_audio_by_poi_and_language(
        self, poi_id: str, language_id: str = "vi"
    ) -> POIAudio | None:
        """Find active audio record for a specific POI and language, with fallback to 'vi'."""
        if not poi_id:
            return None

        translation = (
            self.db.query(POITranslation)
            .filter(
                POITranslation.poi_id == poi_id,
                POITranslation.language_id == language_id,
                POITranslation.audio_url.is_not(None),
            )
            .first()
        )

        if translation is None and language_id != "vi":
            translation = (
                self.db.query(POITranslation)
                .filter(
                    POITranslation.poi_id == poi_id,
                    POITranslation.language_id == "vi",
                    POITranslation.audio_url.is_not(None),
                )
                .first()
            )

        if translation is None or not translation.audio_url:
            return None

        return POIAudio(
            stran_id=translation.stran_id,
            audio_url=translation.audio_url,
            duration=translation.duration,
            file_size=translation.file_size,
            status=translation.status,
        )

    def ping_database(self) -> float:
        """Measure database connection round-trip latency in milliseconds."""
        start = time.perf_counter()
        self.db.execute(func.now())
        return (time.perf_counter() - start) * 1000.0
