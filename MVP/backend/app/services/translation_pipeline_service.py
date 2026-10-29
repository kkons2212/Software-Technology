"""Pipeline orchestrator for automated multilingual translation and audio synthesis (US 04.4)."""

import logging
from collections.abc import Callable
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.services.audio_synthesis_worker import AudioSynthesisWorker
from app.services.translation_worker import TranslationWorker

logger = logging.getLogger(__name__)

DEFAULT_TARGET_LANGUAGES = ["en", "ja", "ko", "zh"]


class TranslationPipelineService:
    """Orchestrate background pipeline translating narratives and synthesizing audio for all target languages."""

    def __init__(
        self,
        session_factory: Callable[[], Session] | None = None,
        audio_dir: Path | None = None,
        translation_worker: TranslationWorker | None = None,
        audio_worker: AudioSynthesisWorker | None = None,
    ):
        settings = get_settings()
        self.session_factory = session_factory or SessionLocal
        self.audio_dir = audio_dir or (Path(settings.STATIC_DIR) / "audio")
        self.translation_worker = translation_worker or TranslationWorker(
            session_factory=self.session_factory
        )
        self.audio_worker = audio_worker or AudioSynthesisWorker(
            session_factory=self.session_factory,
            audio_dir=self.audio_dir,
        )

    async def run_pipeline_for_poi(
        self,
        poi_id: str,
        target_languages: list[str] | None = None,
    ) -> dict[str, dict[str, bool]]:
        """Run translation and audio synthesis for all configured foreign languages.

        US 04.4 - AC-04.4.1 through AC-04.4.4:
        Dispatches background worker jobs for all target languages dynamically from
        the LanguageCode catalog table (excluding 'vi'). Translates text with
        exponential backoff, synthesizes MP3s with SHA-256 deduplication, and strictly
        enforces short-lived JIT database sessions.
        """
        if target_languages is None:
            try:
                with self.session_factory() as db:
                    from app.repositories.language_repository import LanguageRepository

                    lang_repo = LanguageRepository(db)
                    db_langs = lang_repo.list_target_foreign_language_ids(
                        source_language="vi"
                    )
                    languages = db_langs if db_langs else DEFAULT_TARGET_LANGUAGES
            except Exception as exc:
                logger.warning(
                    "Could not retrieve dynamic languages from database for POI %s: %s. Using default targets.",
                    poi_id,
                    exc,
                )
                languages = DEFAULT_TARGET_LANGUAGES
        else:
            languages = target_languages

        results: dict[str, dict[str, bool]] = {}

        logger.info(
            "Starting automated translation & audio pipeline for POI %s (languages: %s)",
            poi_id,
            languages,
        )

        for lang in languages:
            lang_result = {"translation": False, "audio": False}

            # 1. Asynchronous translation
            trans_ok, stran_id = await self.translation_worker.process_translation(
                poi_id=poi_id,
                target_lang=lang,
            )
            lang_result["translation"] = trans_ok

            # 2. Asynchronous TTS synthesis (only if translation succeeded)
            if trans_ok and stran_id:
                audio_ok = await self.audio_worker.process_audio_synthesis(stran_id)
                lang_result["audio"] = audio_ok

            results[lang] = lang_result

        logger.info(
            "Completed automated translation & audio pipeline for POI %s: %s",
            poi_id,
            results,
        )
        return results


async def execute_poi_pipeline_background_task(
    poi_id: str,
    target_languages: list[str] | None = None,
) -> None:
    """Standalone background task handler callable from FastAPI BackgroundTasks."""
    service = TranslationPipelineService()
    try:
        await service.run_pipeline_for_poi(poi_id, target_languages)
    except Exception as exc:
        logger.exception(
            "Unhandled exception in background translation pipeline for POI %s: %s",
            poi_id,
            exc,
        )
