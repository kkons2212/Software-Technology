"""Background worker for asynchronous multilingual translation (US 04.4 - TSK-04.4.1)."""

import logging
import uuid
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.integrations.deep_translator_client import (
    DeepTranslatorClient,
    TranslationError,
)
from app.models.translation import (
    TRANSLATION_STATUS_DRAFT,
    TRANSLATION_STATUS_FAILED,
    TRANSLATION_STATUS_PENDING,
    POITranslation,
)
from app.repositories.translation_repository import TranslationRepository

logger = logging.getLogger(__name__)


class TranslationWorker:
    """Execute background translation with short-lived JIT database sessions."""

    def __init__(
        self,
        session_factory: Callable[[], Session],
        translator_client: DeepTranslatorClient | None = None,
    ):
        self.session_factory = session_factory
        self.translator_client = translator_client or DeepTranslatorClient()

    async def process_translation(
        self,
        poi_id: str,
        target_lang: str,
    ) -> tuple[bool, str | None]:
        """Translate Vietnamese narrative into target language outside DB sessions.

        Returns:
            tuple[success, stran_id]
        """
        # STEP 1: JIT Read - Retrieve Vietnamese source text and close DB immediately
        with self.session_factory() as db:
            trans_repo = TranslationRepository(db)
            source = trans_repo.get_source_translation(poi_id)
            if not source:
                logger.warning(
                    "No Vietnamese source translation found for POI %s", poi_id
                )
                return False, None

            vi_title = source.title
            vi_short = source.short_description
            vi_desc = source.description

            existing = trans_repo.get_by_poi_and_language(poi_id, target_lang)
            if existing:
                stran_id = existing.stran_id
                trans_repo.update_translation(
                    stran_id=stran_id,
                    status=TRANSLATION_STATUS_PENDING,
                )
            else:
                stran_id = f"TR_{uuid.uuid4().hex[:12].upper()}"
                trans_repo.create(
                    POITranslation(
                        stran_id=stran_id,
                        title=f"[{target_lang.upper()}] {vi_title}",
                        short_description=vi_short,
                        description=vi_desc,
                        status=TRANSLATION_STATUS_PENDING,
                        poi_id=poi_id,
                        language_id=target_lang,
                    )
                )

        # -> DB connection closed and released to pool during external translation call

        # STEP 2: External Translation with exponential backoff retries (holding NO DB)
        try:
            translated = await self.translator_client.translate_exhibit_narrative(
                title=vi_title,
                short_description=vi_short,
                description=vi_desc,
                target_lang=target_lang,
                source_lang="vi",
            )
        except (TranslationError, Exception) as exc:
            logger.exception(
                "Translation failed for POI %s language %s: %s",
                poi_id,
                target_lang,
                exc,
            )
            # STEP 3A: Open fresh JIT session to mark FAILED
            with self.session_factory() as db:
                trans_repo = TranslationRepository(db)
                trans_repo.update_translation(
                    stran_id=stran_id,
                    status=TRANSLATION_STATUS_FAILED,
                )
            return False, stran_id

        # STEP 3B: Open fresh JIT session to save translated draft
        with self.session_factory() as db:
            trans_repo = TranslationRepository(db)
            trans_repo.update_translation(
                stran_id=stran_id,
                title=translated["title"],
                short_description=translated["short_description"],
                description=translated["description"],
                status=TRANSLATION_STATUS_DRAFT,
            )

        logger.info(
            "Successfully translated POI %s into %s (stran_id: %s)",
            poi_id,
            target_lang,
            stran_id,
        )
        return True, stran_id
