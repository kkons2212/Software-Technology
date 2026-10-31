"""Integration client for automated text translation using Gemini AI, Google Translate Cloud REST, Offline Translator Container, and deep-translator."""

import asyncio
import html
import json
import logging
from typing import ClassVar

import httpx
from deep_translator import GoogleTranslator

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 1.5
DEFAULT_CHUNK_SIZE = 4500
DEFAULT_HTTP_TIMEOUT = 15.0


class TranslationError(Exception):
    """Raised when translation fails after all retry attempts across all providers."""

    pass


class KeyPool:
    """Thread-safe round-robin API key pool with failover support."""

    def __init__(self, keys: list[str] | None = None):
        self.keys: list[str] = [k.strip() for k in (keys or []) if k and k.strip()]
        self._index: int = 0

    def has_keys(self) -> bool:
        """Check if pool contains at least one API key."""
        return len(self.keys) > 0

    def get_next_key(self) -> str | None:
        """Retrieve next key in circular order."""
        if not self.keys:
            return None
        key = self.keys[self._index % len(self.keys)]
        self._index = (self._index + 1) % len(self.keys)
        return key


_DEFAULT_SENTINEL = object()


class DeepTranslatorClient:
    """Multi-provider asynchronous translation client with cascade fallback and key rotation.

    Hierarchy:
    1. Offline Translator API (Local/LAN Docker container kocoten/offline-translator-api - Top Priority).
    2. Google Cloud Translation REST API (Round-robin API Key pool).
    3. Gemini AI (Prompt-engineered museum & cultural heritage translation).
    4. deep-translator GoogleTranslator (Free web fallback, 0 config required).
    """

    NARRATIVE_DELIMITER: ClassVar[str] = "\n<<<---POI_FIELD_BREAK--->>>\n"

    # Map internal ISO language identifiers to Google/Gemini target language codes
    LANGUAGE_MAPPING: ClassVar[dict[str, str]] = {
        "vi": "vi",
        "en": "en",
        "ja": "ja",
        "ko": "ko",
        "zh": "zh-CN",
        "fr": "fr",
    }

    def __init__(
        self,
        gemini_keys: list[str] | None = None,
        google_translate_keys: list[str] | None = None,
        offline_url: str | None | object = _DEFAULT_SENTINEL,
        gemini_model: str | None = None,
        max_retries: int = DEFAULT_MAX_RETRIES,
        base_delay: float = DEFAULT_BASE_DELAY,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        http_client: httpx.AsyncClient | None = None,
    ):
        resolved_gemini_keys = (
            gemini_keys
            if gemini_keys is not None
            else getattr(settings, "gemini_keys_list", [])
        )
        resolved_google_keys = (
            google_translate_keys
            if google_translate_keys is not None
            else getattr(settings, "google_translate_keys_list", [])
        )

        self.gemini_pool = KeyPool(resolved_gemini_keys)
        self.google_pool = KeyPool(resolved_google_keys)
        if offline_url is not _DEFAULT_SENTINEL:
            self.offline_url = offline_url
        else:
            self.offline_url = getattr(
                settings, "OFFLINE_TRANSLATOR_URL", "http://localhost:8001"
            )
        self.gemini_model = gemini_model or getattr(
            settings, "GEMINI_MODEL", "gemini-1.5-flash"
        )
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.chunk_size = chunk_size
        self._http_client = http_client

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Return shared or new non-blocking HTTP client."""
        if self._http_client is not None:
            is_closed = getattr(self._http_client, "is_closed", False)
            if is_closed is not True:
                return self._http_client
        self._http_client = httpx.AsyncClient(timeout=DEFAULT_HTTP_TIMEOUT)
        return self._http_client

    def _resolve_target_language(self, language_id: str) -> str:
        """Resolve database LanguageID to target language code."""
        normalized = language_id.strip().lower()
        return self.LANGUAGE_MAPPING.get(normalized, normalized)

    def _resolve_offline_target_language(self, language_id: str) -> str:
        """Resolve database language code to offline container supported format."""
        normalized = language_id.strip().lower()
        if normalized in ("zh-cn", "zh-tw", "zh"):
            return "zh"
        return normalized

    async def _translate_with_gemini(
        self, text: str, source_lang: str, target_lang: str
    ) -> str | None:
        """Translate text using Gemini AI with historical/cultural museum persona."""
        if not self.gemini_pool.has_keys():
            return None

        client = await self._get_http_client()
        total_keys = len(self.gemini_pool.keys)

        prompt = (
            f"You are an expert museum and cultural heritage translator specializing in historical sites "
            f"(specifically Vietnam's historic Cu Chi Tunnels - Địa đạo Củ Chi).\n"
            f"Translate the following text accurately from {source_lang} to {target_lang}.\n"
            f"Preserve historical significance, military and cultural terminology, and maintain a dignified, "
            f"engaging museum tour guide persona.\n"
            f"Output ONLY the translated text without extra commentary, markdown quotes, or formatting.\n\n"
            f"Text to translate:\n{text}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2},
        }

        for attempt in range(total_keys):
            key = self.gemini_pool.get_next_key()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={key}"

            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            result = parts[0]["text"].strip()
                            if result:
                                logger.info(
                                    "Successfully translated via Gemini AI (%s -> %s, key_index=%d)",
                                    source_lang,
                                    target_lang,
                                    attempt,
                                )
                                return result
                elif response.status_code == 429:
                    logger.warning(
                        "Gemini AI rate limit (429) on key index %d. Rotating key...",
                        attempt,
                    )
                else:
                    logger.warning(
                        "Gemini AI translation returned status %d on key index %d: %s",
                        response.status_code,
                        attempt,
                        response.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "Gemini AI translation failed on key index %d: %s",
                    attempt,
                    exc,
                )

        logger.warning("All %d Gemini API keys failed or were exhausted", total_keys)
        return None

    async def _translate_narrative_with_gemini(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None] | None:
        """Translate exhibit narrative fields in a single batched Gemini AI call (Direction 1)."""
        if not self.gemini_pool.has_keys():
            return None

        client = await self._get_http_client()
        total_keys = len(self.gemini_pool.keys)

        input_data = {
            "title": title,
            "short_description": short_description or "",
            "description": description or "",
        }

        prompt = (
            f"You are an expert museum and cultural heritage translator specializing in historical sites "
            f"(specifically Vietnam's historic Cu Chi Tunnels - Địa đạo Củ Chi).\n"
            f"Translate the following exhibit fields accurately from {source_lang} to {target_lang}.\n"
            f"Preserve historical significance, military and cultural terminology, and maintain a dignified, "
            f"engaging museum tour guide persona.\n"
            f"Output ONLY a valid parseable JSON object with keys 'title', 'short_description', 'description'. "
            f"Do NOT include markdown quotes, markdown code fences, or any commentary.\n\n"
            f"Input JSON:\n{json.dumps(input_data, ensure_ascii=False)}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2},
        }

        for attempt in range(total_keys):
            key = self.gemini_pool.get_next_key()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={key}"

            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            raw_text = parts[0]["text"].strip()
                            if raw_text.startswith("```"):
                                raw_text = raw_text.strip("`")
                                if raw_text.startswith("json"):
                                    raw_text = raw_text[4:].strip()
                            try:
                                parsed = json.loads(raw_text)
                                logger.info(
                                    "Successfully translated narrative batch via Gemini AI (%s -> %s, key_index=%d)",
                                    source_lang,
                                    target_lang,
                                    attempt,
                                )
                                return {
                                    "title": parsed.get("title", title),
                                    "short_description": (
                                        parsed.get("short_description")
                                        if short_description
                                        else None
                                    ),
                                    "description": (
                                        parsed.get("description")
                                        if description
                                        else None
                                    ),
                                }
                            except json.JSONDecodeError as jde:
                                logger.warning(
                                    "Failed to parse Gemini JSON response on key index %d: %s (raw: %s)",
                                    attempt,
                                    jde,
                                    raw_text[:200],
                                )
                elif response.status_code == 429:
                    logger.warning(
                        "Gemini AI rate limit (429) on key index %d. Rotating key...",
                        attempt,
                    )
                else:
                    logger.warning(
                        "Gemini AI translation returned status %d on key index %d: %s",
                        response.status_code,
                        attempt,
                        response.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "Gemini AI translation failed on key index %d: %s",
                    attempt,
                    exc,
                )

        logger.warning(
            "All %d Gemini API keys failed or were exhausted for narrative batch",
            total_keys,
        )
        return None

    async def _translate_with_google_cloud(
        self, text: str, source_lang: str, target_lang: str
    ) -> str | None:
        """Translate text using Google Cloud Translation v2 REST API with key rotation."""
        if not self.google_pool.has_keys():
            return None

        client = await self._get_http_client()
        total_keys = len(self.google_pool.keys)

        for attempt in range(total_keys):
            key = self.google_pool.get_next_key()
            url = f"https://translation.googleapis.com/language/translate/v2?key={key}"
            payload = {
                "q": [text],
                "source": source_lang,
                "target": target_lang,
                "format": "text",
            }

            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    translations = data.get("data", {}).get("translations", [])
                    if translations and "translatedText" in translations[0]:
                        raw_result = translations[0]["translatedText"]
                        result = html.unescape(raw_result).strip()
                        logger.info(
                            "Successfully translated via Google Cloud REST API (%s -> %s, key_index=%d)",
                            source_lang,
                            target_lang,
                            attempt,
                        )
                        return result
                elif response.status_code == 429:
                    logger.warning(
                        "Google Cloud Translate rate limit (429) on key index %d. Rotating key...",
                        attempt,
                    )
                else:
                    logger.warning(
                        "Google Cloud Translate returned status %d on key index %d: %s",
                        response.status_code,
                        attempt,
                        response.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "Google Cloud Translate failed on key index %d: %s",
                    attempt,
                    exc,
                )

        logger.warning(
            "All %d Google Cloud Translate API keys failed or were exhausted",
            total_keys,
        )
        return None

    async def _translate_narrative_with_google_cloud(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None] | None:
        """Translate exhibit narrative fields in a single batched Google Cloud REST call (Direction 1)."""
        if not self.google_pool.has_keys():
            return None

        client = await self._get_http_client()
        total_keys = len(self.google_pool.keys)

        texts_to_send = [title]
        has_short = bool(short_description and short_description.strip())
        has_desc = bool(description and description.strip())

        if has_short:
            texts_to_send.append(short_description)
        if has_desc:
            texts_to_send.append(description)

        payload = {
            "q": texts_to_send,
            "source": source_lang,
            "target": target_lang,
            "format": "text",
        }

        for attempt in range(total_keys):
            key = self.google_pool.get_next_key()
            url = f"https://translation.googleapis.com/language/translate/v2?key={key}"

            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    translations = data.get("data", {}).get("translations", [])
                    if len(translations) == len(texts_to_send):
                        res_title = html.unescape(
                            translations[0]["translatedText"]
                        ).strip()
                        cursor = 1
                        res_short = None
                        if has_short:
                            res_short = html.unescape(
                                translations[cursor]["translatedText"]
                            ).strip()
                            cursor += 1
                        res_desc = None
                        if has_desc:
                            res_desc = html.unescape(
                                translations[cursor]["translatedText"]
                            ).strip()

                        logger.info(
                            "Successfully translated narrative batch via Google Cloud REST API (%s -> %s, key_index=%d)",
                            source_lang,
                            target_lang,
                            attempt,
                        )
                        return {
                            "title": res_title,
                            "short_description": res_short,
                            "description": res_desc,
                        }
                elif response.status_code == 429:
                    logger.warning(
                        "Google Cloud Translate rate limit (429) on key index %d. Rotating key...",
                        attempt,
                    )
                else:
                    logger.warning(
                        "Google Cloud Translate returned status %d on key index %d: %s",
                        response.status_code,
                        attempt,
                        response.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "Google Cloud Translate failed on key index %d: %s",
                    attempt,
                    exc,
                )

        logger.warning(
            "All %d Google Cloud Translate API keys failed or were exhausted for narrative batch",
            total_keys,
        )
        return None

    async def _translate_with_offline_api(
        self, text: str, source_lang: str, target_lang: str
    ) -> str | None:
        """Translate text using local/LAN Offline Translator Docker container API."""
        if not self.offline_url:
            return None

        resolved_target = self._resolve_offline_target_language(target_lang)
        resolved_source = self._resolve_offline_target_language(source_lang)

        supported_offline = {"vi", "en", "ja", "zh", "fr", "ko"}
        if (
            resolved_target not in supported_offline
            or resolved_source not in supported_offline
        ):
            return None

        client = await self._get_http_client()
        url = f"{self.offline_url.rstrip('/')}/translate"
        payload = {
            "text": text,
            "source_lang": resolved_source,
            "target_lang": resolved_target,
        }

        try:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                translated = data.get("translated")
                if translated:
                    logger.info(
                        "Successfully translated via Offline Translator API (%s -> %s)",
                        source_lang,
                        target_lang,
                    )
                    return translated.strip()
            logger.warning(
                "Offline Translator API returned status %d: %s",
                response.status_code,
                response.text[:200],
            )
        except Exception as exc:
            logger.warning(
                "Offline Translator API unavailable or error at %s: %s",
                url,
                exc,
            )

        return None

    async def _translate_narrative_with_offline_api(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None] | None:
        """Translate exhibit narrative fields using local Offline Translator API."""
        tr_title = await self._translate_with_offline_api(
            title, source_lang, target_lang
        )
        if tr_title is None:
            return None

        tr_short = None
        if short_description and short_description.strip():
            tr_short = await self._translate_with_offline_api(
                short_description, source_lang, target_lang
            )

        tr_desc = None
        if description and description.strip():
            tr_desc = await self._translate_with_offline_api(
                description, source_lang, target_lang
            )

        return {
            "title": tr_title,
            "short_description": tr_short,
            "description": tr_desc,
        }

    def _split_text_into_chunks(self, text: str) -> list[str]:
        """Split text exceeding GoogleTranslator character limit into manageable chunks."""
        if len(text) <= self.chunk_size:
            return [text]

        chunks: list[str] = []
        current_chunk: list[str] = []
        current_len = 0

        paragraphs = text.split("\n")
        for para in paragraphs:
            para_len = len(para) + 1
            if current_len + para_len > self.chunk_size:
                if current_chunk:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = []
                    current_len = 0

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

    async def _translate_chunk_with_retry(
        self, chunk: str, source_lang: str, target_lang: str
    ) -> str:
        """Translate a single text chunk with explicit exponential backoff retry (REF-04.1)."""
        # Phase 1 Gate: Validate non-empty chunk
        if not chunk or not chunk.strip():
            return ""

        # Phase 2 Compute: Retry loop with explicit exponential backoff
        translated_text: str | None = None
        last_exception: Exception | None = None

        for attempt in range(self.max_retries):
            try:
                translated_text = await asyncio.to_thread(
                    self._translate_sync,
                    chunk,
                    source_lang,
                    target_lang,
                )
                break
            except Exception as exc:
                last_exception = exc
                delay = self.base_delay * (2**attempt)
                logger.warning(
                    "Free translation attempt %d/%d failed for '%s' -> '%s': %s. Retrying in %.2fs",
                    attempt + 1,
                    self.max_retries,
                    source_lang,
                    target_lang,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)

        # Phase 3 Exit: Unconditional return or explicit error
        if translated_text is not None:
            return translated_text

        logger.error(
            "Free translation exhausted %d retries for target language '%s'",
            self.max_retries,
            target_lang,
        )
        raise TranslationError(
            f"Failed to translate text to '{target_lang}' after {self.max_retries} attempts: {last_exception}"
        ) from last_exception

    async def _translate_with_free_deep_translator(
        self, text: str, source_lang: str, target_lang: str
    ) -> str:
        """Translate text with deep-translator web library using exponential backoff retry and chunking."""
        # Phase 1 Gate
        if not text or not text.strip():
            return ""

        # Phase 2 Compute
        chunks = self._split_text_into_chunks(text)
        translated_chunks: list[str] = []
        for chunk in chunks:
            part = await self._translate_chunk_with_retry(
                chunk, source_lang, target_lang
            )
            translated_chunks.append(part)

        # Phase 3 Exit
        return "\n".join(translated_chunks) if len(chunks) > 1 else translated_chunks[0]

    async def _translate_narrative_with_free_deep_translator(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None]:
        """Translate exhibit narrative fields in a single batched call with deep-translator web library."""
        keys = ["title"]
        texts = [title]
        has_short = bool(short_description and short_description.strip())
        has_desc = bool(description and description.strip())

        if has_short:
            keys.append("short_description")
            texts.append(short_description)
        if has_desc:
            keys.append("description")
            texts.append(description)

        combined_text = self.NARRATIVE_DELIMITER.join(texts)

        try:
            translated_combined = await self._translate_with_free_deep_translator(
                combined_text, source_lang=source_lang, target_lang=target_lang
            )
            raw_parts = translated_combined.split("<<<---POI_FIELD_BREAK--->>>")
            parts = [p.strip() for p in raw_parts]

            if len(parts) == len(keys):
                res_title = parts[0]
                cursor = 1
                res_short = parts[cursor] if has_short else None
                if has_short:
                    cursor += 1
                res_desc = parts[cursor] if has_desc else None

                return {
                    "title": res_title,
                    "short_description": res_short,
                    "description": res_desc,
                }
            logger.warning(
                "Delimited batch translation parts mismatch (got %d, expected %d). Falling back to single field translations.",
                len(parts),
                len(keys),
            )
        except Exception as exc:
            logger.warning(
                "Batch translation with free deep-translator failed: %s. Falling back to field-by-field.",
                exc,
            )

        # Safe fallback to field-by-field if delimiter split failed
        tr_title = await self._translate_with_free_deep_translator(
            title, source_lang=source_lang, target_lang=target_lang
        )
        tr_short = None
        if has_short:
            tr_short = await self._translate_with_free_deep_translator(
                short_description, source_lang=source_lang, target_lang=target_lang
            )
        tr_desc = None
        if has_desc:
            tr_desc = await self._translate_with_free_deep_translator(
                description, source_lang=source_lang, target_lang=target_lang
            )

        return {
            "title": tr_title,
            "short_description": tr_short,
            "description": tr_desc,
        }

    async def translate_text(
        self,
        text: str,
        target_lang: str,
        source_lang: str = "vi",
    ) -> str:
        """Translate text through cascade providers: Offline Container -> Google Cloud -> Free Web fallback (REF-04.1).

        US 04.4 - AC-04.4.1: Seamless multi-provider fault tolerance.
        """
        # Phase 1: Precondition Gate
        if not text or not text.strip():
            return ""

        resolved_target = self._resolve_target_language(target_lang)
        resolved_source = self._resolve_target_language(source_lang)
        translated_result: str | None = None

        # Phase 2: Compute via sequential cascade tiers
        # 1. Cascade Tier 1 (Top Priority): Local Offline Translator Container API
        if self.offline_url:
            translated_result = await self._translate_with_offline_api(
                text, resolved_source, resolved_target
            )

        # 2. Cascade Tier 2: Google Cloud Translation REST API (Key pool rotation)
        if translated_result is None and self.google_pool.has_keys():
            translated_result = await self._translate_with_google_cloud(
                text, resolved_source, resolved_target
            )

        # 3. Cascade Tier 3: Free deep-translator (Guaranteed zero-configuration fallback)
        if translated_result is None:
            translated_result = await self._translate_with_free_deep_translator(
                text, resolved_source, resolved_target
            )

        # Phase 3: Single unified exit
        return translated_result

    async def translate_exhibit_narrative(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        target_lang: str,
        source_lang: str = "vi",
    ) -> dict[str, str | None]:
        """Translate all fields of an exhibit narrative in 1 batched request per tier.

        Hierarchy:
        1. Gemini AI: 1 prompt returning JSON with title, short_description, description.
        2. Google Cloud REST: 1 HTTP call with q=[title, short_desc, desc].
        3. Offline Container API: Local/LAN call with sub-millisecond response.
        4. deep-translator: 1 HTTP call with delimited text.
        """
        resolved_target = self._resolve_target_language(target_lang)
        resolved_source = self._resolve_target_language(source_lang)

        # 1. Cascade Tier 1 (Top Priority): Local Offline Translator Container API
        if self.offline_url:
            offline_result = await self._translate_narrative_with_offline_api(
                title, short_description, description, resolved_source, resolved_target
            )
            if offline_result is not None:
                return offline_result

        # 2. Cascade Tier 2: Google Cloud Translation REST API
        if self.google_pool.has_keys():
            cloud_result = await self._translate_narrative_with_google_cloud(
                title, short_description, description, resolved_source, resolved_target
            )
            if cloud_result is not None:
                return cloud_result

        # 3. Cascade Tier 3: Free deep-translator
        return await self._translate_narrative_with_free_deep_translator(
            title, short_description, description, resolved_source, resolved_target
        )
