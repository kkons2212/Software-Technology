"""Background worker for Neural Voice TTS synthesis and SHA-256 caching (US 04.4 - TSK-04.4.2 & TSK-04.4.3)."""

import logging
from collections.abc import Callable
from pathlib import Path

from sqlalchemy.orm import Session

from app.integrations.edge_tts_client import EdgeTTSClient, compute_audio_hash
from app.models.audio import AUDIO_STATUS_READY
from app.models.translation import (
    TRANSLATION_STATUS_DRAFT,
    TRANSLATION_STATUS_NEEDS_UPDATE,
)
from app.repositories.audio_repository import AudioRepository
from app.repositories.translation_repository import TranslationRepository

logger = logging.getLogger(__name__)


class AudioSynthesisWorker:
    """Execute background audio synthesis using short-lived JIT sessions and SHA-256 deduplication."""

    def __init__(
        self,
        session_factory: Callable[[], Session],
        audio_dir: Path,
        tts_client: EdgeTTSClient | None = None,
    ):
        self.session_factory = session_factory
        self.audio_dir = audio_dir
        self.tts_client = tts_client or EdgeTTSClient()

    async def process_audio_synthesis(self, stran_id: str) -> bool:
        """Synthesize localized narration into MP3 or reuse existing audio file.

        US 04.4 - AC-04.4.2 & AC-04.4.3: Enforces JIT database lifecycle and SHA-256 content caching.
        """
        # STEP 1: JIT Read - Retrieve text data and close DB immediately
        with self.session_factory() as db:
            audio_repo = AudioRepository(db)
            try:
                lang_id, title, short_desc, desc = audio_repo.get_generation_text(
                    stran_id
                )
            except Exception as exc:
                logger.warning(
                    "Cannot retrieve generation text for translation %s: %s",
                    stran_id,
                    exc,
                )
                return False

        narration = "\n\n".join(
            part.strip() for part in (title, short_desc, desc) if part and part.strip()
        )
        if not narration:
            logger.warning("Empty narrative for translation %s, skipping TTS", stran_id)
            return False

        # STEP 2: Compute SHA-256 hash and synthesize speech (holding NO DB connection)
        # AC-04.4.3 / dev_rules 5.2: audio_hash includes voice_id for exact cache fidelity
        voice_id = None
        if hasattr(self.tts_client, "resolve_voice"):
            try:
                voice_id = await self.tts_client.resolve_voice(lang_id)
            except Exception:
                voice_id = None

        audio_hash = compute_audio_hash(
            title=title,
            description=desc,
            language_id=lang_id,
            voice_id=voice_id,
        )

        try:
            audio_url, file_size, is_reused = await self.tts_client.synthesize_or_reuse(
                text=narration,
                language_id=lang_id,
                audio_dir=self.audio_dir,
                audio_hash=audio_hash,
            )
        except Exception as exc:
            logger.exception(
                "Audio synthesis failed for translation %s (%s): %s",
                stran_id,
                lang_id,
                exc,
            )
            # STEP 3A: Open fresh JIT session to mark audio FAILED and translation NEEDS_UPDATE
            with self.session_factory() as db:
                audio_repo = AudioRepository(db)
                audio_repo.set_audio_failed(stran_id)
                trans_repo = TranslationRepository(db)
                trans_repo.update_translation(
                    stran_id=stran_id,
                    status=TRANSLATION_STATUS_NEEDS_UPDATE,
                )
            return False

        # STEP 3B: Open fresh JIT session to save audio record and mark translation DRAFT
        with self.session_factory() as db:
            audio_repo = AudioRepository(db)
            audio_repo.upsert_audio(
                stran_id=stran_id,
                audio_url=audio_url,
                file_size=file_size,
                status=AUDIO_STATUS_READY,
            )
            trans_repo = TranslationRepository(db)
            trans_repo.update_translation(
                stran_id=stran_id,
                status=TRANSLATION_STATUS_DRAFT,
            )

        logger.info(
            "Successfully synthesized audio for translation %s (%s, reused: %s, url: %s)",
            stran_id,
            lang_id,
            is_reused,
            audio_url,
        )
        return True
