"""Integration client for automated text translation using deep-translator."""

import asyncio
import logging
from typing import ClassVar

from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 1.0
DEFAULT_CHUNK_SIZE = 4500


class TranslationError(Exception):
    """Raised when translation fails after all retry attempts."""

    pass


class DeepTranslatorClient:
    """Asynchronous adapter wrapping GoogleTranslator with exponential backoff and text chunking."""

    # Map internal ISO language identifiers to GoogleTranslator codes
    LANGUAGE_MAPPING: ClassVar[dict[str, str]] = {
        "vi": "vi",
        "en": "en",
        "ja": "ja",
        "ko": "ko",
        "zh": "zh-CN",
    }

    def __init__(
        self,
        max_retries: int = DEFAULT_MAX_RETRIES,
        base_delay: float = DEFAULT_BASE_DELAY,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.chunk_size = chunk_size

    def _resolve_target_language(self, language_id: str) -> str:
        """Resolve database LanguageID to deep-translator target language code."""
        normalized = language_id.strip().lower()
        return self.LANGUAGE_MAPPING.get(normalized, normalized)

    def _split_text_into_chunks(self, text: str) -> list[str]:
        """Split text exceeding GoogleTranslator character limit into manageable chunks."""
        if len(text) <= self.chunk_size:
            return [text]

        chunks: list[str] = []
        current_chunk: list[str] = []
        current_len = 0

        # Attempt to split cleanly on paragraphs or newlines first
        paragraphs = text.split("\n")
        for para in paragraphs:
            para_len = len(para) + 1
            if current_len + para_len > self.chunk_size:
                if current_chunk:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = []
                    current_len = 0

                # If a single paragraph exceeds chunk_size, split by sentences/spaces
                if len(para) > self.chunk_size:
                    words = para.split(" ")
                    temp_chunk: list[str] = []
                    temp_len = 0
                    for word in words:
                        word_len = len(word) + 1
                        if temp_len + word_len > self.chunk_size:
                            chunks.append(" ".join(temp_chunk))
                            temp_chunk = [word]
                            temp_len = word_len
                        else:
                            temp_chunk.append(word)
                            temp_len += word_len
                    if temp_chunk:
                        current_chunk.append(" ".join(temp_chunk))
                        current_len += len(temp_chunk)
                else:
                    current_chunk.append(para)
                    current_len += para_len
            else:
                current_chunk.append(para)
                current_len += para_len

        if current_chunk:
            chunks.append("\n".join(current_chunk))

        return chunks

    def _translate_sync(self, text: str, source: str, target: str) -> str:
        """Direct synchronous translation call using GoogleTranslator."""
        translator = GoogleTranslator(source=source, target=target)
        result = translator.translate(text)
        return result or ""

    async def translate_text(
        self,
        text: str,
        target_lang: str,
        source_lang: str = "vi",
    ) -> str:
        """Translate text with exponential backoff retry and automatic chunking.

        US 04.4 - AC-04.4.1: Retries up to 3 times on transient network drops.
        """
        if not text or not text.strip():
            return ""

        resolved_target = self._resolve_target_language(target_lang)
        resolved_source = self._resolve_target_language(source_lang)

        chunks = self._split_text_into_chunks(text)
        translated_chunks: list[str] = []

        for chunk in chunks:
            chunk_translated = False
            last_exception: Exception | None = None

            for attempt in range(self.max_retries):
                try:
                    # Run synchronous deep-translator HTTP request in background threadpool
                    translated_part = await asyncio.to_thread(
                        self._translate_sync,
                        chunk,
                        resolved_source,
                        resolved_target,
                    )
                    translated_chunks.append(translated_part)
                    chunk_translated = True
                    break
                except Exception as exc:
                    last_exception = exc
                    delay = self.base_delay * (2**attempt)
                    logger.warning(
                        "Translation attempt %d/%d failed for '%s' -> '%s': %s. Retrying in %.2fs",
                        attempt + 1,
                        self.max_retries,
                        resolved_source,
                        resolved_target,
                        exc,
                        delay,
                    )
                    await asyncio.sleep(delay)

            if not chunk_translated:
                logger.error(
                    "Translation exhausted %d retries for target language '%s'",
                    self.max_retries,
                    target_lang,
                )
                raise TranslationError(
                    f"Failed to translate text to '{target_lang}' after {self.max_retries} attempts: {last_exception}"
                ) from last_exception

        return "\n".join(translated_chunks) if len(chunks) > 1 else translated_chunks[0]

    async def translate_exhibit_narrative(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        target_lang: str,
        source_lang: str = "vi",
    ) -> dict[str, str | None]:
        """Translate all fields of an exhibit narrative into the target language."""
        translated_title = await self.translate_text(
            title, target_lang=target_lang, source_lang=source_lang
        )

        translated_short = None
        if short_description and short_description.strip():
            translated_short = await self.translate_text(
                short_description, target_lang=target_lang, source_lang=source_lang
            )

        translated_desc = None
        if description and description.strip():
            translated_desc = await self.translate_text(
                description, target_lang=target_lang, source_lang=source_lang
            )

        return {
            "title": translated_title,
            "short_description": translated_short,
            "description": translated_desc,
        }
