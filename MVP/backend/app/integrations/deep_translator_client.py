"""Integration client for automated text translation using Auto_Translate Live API (Render) and OpenRouter AI."""

import asyncio
import json
import logging
import time
from typing import ClassVar

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 1.5
DEFAULT_CHUNK_SIZE = 4500
RENDER_MAX_CHUNK_CHARS = 500
DEFAULT_RENDER_TIMEOUT = 70.0
DEFAULT_RENDER_COLD_START_DELAY = 10.0
HEALTH_CHECK_TIMEOUT = 5.0
SPINUP_HTTP_STATUSES = (502, 503, 504)


class TranslationError(Exception):
    """Raised when translation fails after all retry attempts across all providers."""

    pass


class DeepTranslatorClient:
    """Two-tier asynchronous translation client with automatic cascade fallback.

    Supported Providers:
    - Primary (#1): Auto_Translate Live API (OPUS-MT INT8 on Render - 0 API key required)
    - Fallback (#2): OpenRouter AI (Free model router - openrouter/free)

    Configured via TRANSLATION_PROVIDERS_ORDER in .env (default: "render_api,openrouter").
    """

    NARRATIVE_DELIMITER: ClassVar[str] = "\n<<<---POI_FIELD_BREAK--->>>\n"

    # Canonical mapping for Render Live API target languages
    RENDER_LANGUAGE_MAPPING: ClassVar[dict[str, str]] = {
        "en": "English",
        "english": "English",
        "fr": "French",
        "french": "French",
        "de": "German",
        "german": "German",
        "es": "Spanish",
        "spanish": "Spanish",
        "ja": "Japanese",
        "japanese": "Japanese",
        "zh": "Chinese",
        "zh-cn": "Chinese",
        "zh-tw": "Chinese",
        "chinese": "Chinese",
        "ko": "Korean",
        "korean": "Korean",
        "ru": "Russian",
        "russian": "Russian",
        "vi": "Vietnamese",
        "vietnamese": "Vietnamese",
    }

    # Aliases mapping user-configurable terms to canonical provider names
    PROVIDER_ALIASES: ClassVar[dict[str, str]] = {
        "render_api": "render_api",
        "render": "render_api",
        "auto_translate": "render_api",
        "live_api": "render_api",
        "openrouter": "openrouter",
        "open_router": "openrouter",
        "crouton": "openrouter",
        "apikey": "openrouter",
        "api_key": "openrouter",
    }

    def __init__(
        self,
        render_api_url: str | None = None,
        render_timeout: float | None = None,
        cold_start_delay: float | None = None,
        openrouter_key: str | None = None,
        openrouter_model: str | None = None,
        openrouter_base_url: str | None = None,
        providers_order: list[str] | None = None,
        max_retries: int = DEFAULT_MAX_RETRIES,
        base_delay: float = DEFAULT_BASE_DELAY,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        http_client: httpx.AsyncClient | None = None,
    ):
        raw_render_url = render_api_url or getattr(
            settings,
            "RENDER_TRANSLATION_API_URL",
            "https://translation-temporary.onrender.com",
        )
        self.render_api_url: str = raw_render_url.strip().rstrip("/")
        self.render_timeout: float = (
            render_timeout
            if render_timeout is not None
            else getattr(settings, "RENDER_TRANSLATION_TIMEOUT", DEFAULT_RENDER_TIMEOUT)
        )
        self.cold_start_delay: float = (
            cold_start_delay
            if cold_start_delay is not None
            else getattr(
                settings,
                "RENDER_COLD_START_RETRY_DELAY",
                DEFAULT_RENDER_COLD_START_DELAY,
            )
        )

        self.openrouter_key: str = (
            openrouter_key
            if openrouter_key is not None
            else getattr(settings, "OPENROUTER_API_KEY", "")
        )
        self.openrouter_model: str = (
            openrouter_model
            if openrouter_model is not None and openrouter_model.strip()
            else getattr(settings, "OPENROUTER_MODEL", "openrouter/free")
        ) or "openrouter/free"
        self.openrouter_base_url: str = openrouter_base_url or getattr(
            settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        )

        raw_order = (
            providers_order
            if providers_order is not None
            else getattr(
                settings,
                "translation_providers_list",
                ["render_api", "openrouter"],
            )
        )
        self.providers_order: list[str] = [
            p.strip().lower() for p in raw_order if p and p.strip()
        ]

        self.max_retries: int = max_retries
        self.base_delay: float = base_delay
        self.chunk_size: int = chunk_size
        self._http_client: httpx.AsyncClient | None = http_client
        self._clients_by_timeout: dict[float, httpx.AsyncClient] = {}

    async def _get_http_client(
        self, timeout: float = DEFAULT_RENDER_TIMEOUT
    ) -> httpx.AsyncClient:
        """Return injected test client or timeout-isolated non-blocking HTTP client."""
        if self._http_client is not None:
            is_closed = getattr(self._http_client, "is_closed", False)
            if is_closed is not True:
                return self._http_client

        cached = self._clients_by_timeout.get(timeout)
        if cached is not None and getattr(cached, "is_closed", False) is not True:
            return cached

        new_client = httpx.AsyncClient(timeout=timeout)
        self._clients_by_timeout[timeout] = new_client
        return new_client

    def _resolve_effective_order(self) -> list[str]:
        """Normalize configured providers list via PROVIDER_ALIASES."""
        return [self.PROVIDER_ALIASES.get(p, p) for p in self.providers_order]

    def _compute_retry_delay(
        self, attempt: int, is_spinup_status: bool = False
    ) -> float:
        """Compute retry wait duration, extending backoff on Render cold-start 502/503/504."""
        if is_spinup_status:
            return self.cold_start_delay * (attempt + 1)
        return self.base_delay * (2**attempt)

    def _resolve_render_target(self, language_id: str) -> str:
        """Resolve database LanguageID or code into Render API target name."""
        normalized = language_id.strip().lower()
        resolved_name = self.RENDER_LANGUAGE_MAPPING.get(normalized, language_id)
        return resolved_name

    async def check_health(self, timeout: float = HEALTH_CHECK_TIMEOUT) -> dict | None:
        """Probe Render Live API health and telemetry endpoint for diagnostics or wake-up (SISE Compliant)."""
        client = await self._get_http_client(timeout=timeout)
        url = f"{self.render_api_url}/health"
        health_data: dict | None = None

        try:
            response = await client.get(url)
            if response.status_code == 200:
                health_data = response.json()
            else:
                logger.warning(
                    "Render API health check returned non-200 status: %d",
                    response.status_code,
                )
        except Exception as exc:
            logger.warning("Render API health check request failed: %s", exc)

        return health_data

    async def _wait_for_render_wakeup(self) -> bool:
        """Wait for Render Live API container to wake from cold sleep via GET /health within render_timeout."""
        # Phase 1 Gate: Guard against missing endpoint
        if not self.render_api_url:
            return False

        # Phase 2 Compute: Poll /health within render_timeout budget
        deadline = time.monotonic() + max(1.0, self.render_timeout)
        url = f"{self.render_api_url}/health"
        is_awake = False

        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break

            client = await self._get_http_client(timeout=remaining)
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    payload = response.json()
                    logger.info(
                        "Render API woke up and is healthy (ram=%.1fMB)",
                        payload.get("current_ram_mb", 0.0),
                    )
                    is_awake = True
                    break
                if response.status_code not in SPINUP_HTTP_STATUSES:
                    logger.warning(
                        "Render API wake-up /health returned unexpected status %d",
                        response.status_code,
                    )
                    break
            except httpx.TimeoutException:
                logger.warning(
                    "Render API wake-up /health timed out (budget=%.1fs)",
                    self.render_timeout,
                )
                break
            except Exception as exc:
                logger.warning("Render API wake-up /health failed: %s", exc)
                break

            wait_seconds = min(
                self.cold_start_delay, max(0.0, deadline - time.monotonic())
            )
            if wait_seconds <= 0:
                break
            await asyncio.sleep(wait_seconds)

        # Phase 3 Exit: Single structured return
        return is_awake

    def _split_text_for_render(
        self, text: str, max_chars: int = RENDER_MAX_CHUNK_CHARS
    ) -> list[str]:
        """Split long text into Render-safe chunks to avoid CPU timeout and 512MB OOM."""
        if len(text) <= max_chars:
            return [text]

        chunks: list[str] = []
        current = ""

        for raw_para in text.splitlines():
            para = raw_para.strip()
            if not para:
                continue

            # Split oversized paragraphs by sentence boundaries or word boundaries
            segments = (
                [para]
                if len(para) <= max_chars
                else self._split_long_segment(para, max_chars)
            )
            for seg in segments:
                candidate = f"{current}\n{seg}" if current else seg
                if len(candidate) <= max_chars:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    current = seg

        if current:
            chunks.append(current)

        return chunks or [text]

    def _split_long_segment(self, text: str, max_chars: int) -> list[str]:
        """Break an oversized paragraph into sentence or word-bounded chunks <= max_chars."""
        parts: list[str] = []
        remaining = text.strip()

        while len(remaining) > max_chars:
            window = remaining[:max_chars]
            cut = max(
                window.rfind(". "),
                window.rfind("! "),
                window.rfind("? "),
                window.rfind("; "),
            )
            if cut > max_chars // 3:
                cut += 1
            else:
                space_cut = window.rfind(" ")
                cut = space_cut if space_cut > 0 else max_chars

            parts.append(remaining[:cut].strip())
            remaining = remaining[cut:].strip()

        if remaining:
            parts.append(remaining)

        return parts

    async def _post_render_chunk(
        self, chunk_text: str, source_lang: str, target_name: str
    ) -> str | None:
        """Send a single Render API /translate request with /health wake-up and anti-pileup timeout handling."""
        url = f"{self.render_api_url}/translate"
        payload = {"text": chunk_text, "target": target_name}
        client = await self._get_http_client(timeout=self.render_timeout)
        translated_result: str | None = None
        attempted_wakeup = False

        for attempt in range(self.max_retries):
            attempt_delay = self._compute_retry_delay(attempt)
            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidate = data.get("translated_text", "").strip()
                    if candidate:
                        translated_result = candidate
                        logger.info(
                            "Render API translated chunk successfully (%s -> %s, chars=%d, latency=%.1fms)",
                            source_lang,
                            target_name,
                            len(chunk_text),
                            data.get("latency_ms", 0.0),
                        )
                        break
                elif response.status_code == 400:
                    logger.warning(
                        "Render API returned 400 Bad Request: %s", response.text[:200]
                    )
                    break
                elif response.status_code in SPINUP_HTTP_STATUSES:
                    if not attempted_wakeup:
                        attempted_wakeup = True
                        logger.warning(
                            "Render API returned %d on attempt %d/%d; probing /health up to %.1fs to wake container",
                            response.status_code,
                            attempt + 1,
                            self.max_retries,
                            self.render_timeout,
                        )
                        woke_up = await self._wait_for_render_wakeup()
                        if woke_up:
                            continue
                        break
                    attempt_delay = self._compute_retry_delay(
                        attempt, is_spinup_status=True
                    )
                    logger.warning(
                        "Render API still returned %d after wake-up on attempt %d/%d; waiting %.1fs",
                        response.status_code,
                        attempt + 1,
                        self.max_retries,
                        attempt_delay,
                    )
                else:
                    logger.warning(
                        "Render API returned status %d on attempt %d: %s",
                        response.status_code,
                        attempt + 1,
                        response.text[:200],
                    )
            except httpx.TimeoutException:
                logger.warning(
                    "Render API timeout (cold start / busy) on attempt %d (limit=%.1fs, chars=%d)",
                    attempt + 1,
                    self.render_timeout,
                    len(chunk_text),
                )
                # Avoid piling multiple heavy requests onto Render 512MB/0.1-CPU container
                if not attempted_wakeup and attempt < self.max_retries - 1:
                    attempted_wakeup = True
                    woke_up = await self._wait_for_render_wakeup()
                    if woke_up:
                        continue
                break
            except Exception as exc:
                logger.warning(
                    "Render API request error on attempt %d: %s", attempt + 1, exc
                )

            if attempt < self.max_retries - 1:
                await asyncio.sleep(attempt_delay)

        return translated_result

    async def _translate_with_render_api(
        self, text: str, source_lang: str, target_lang: str
    ) -> str | None:
        """Translate text via Auto_Translate Live API on Render with safe chunking and wake-up."""
        # Phase 1 Gate: Guard against missing endpoint or empty text
        if not self.render_api_url:
            return None
        clean_text = text.strip()
        if not clean_text:
            return ""

        # Phase 2 Compute: Split oversized text into Render-safe chunks and translate sequentially
        target_name = self._resolve_render_target(target_lang)
        chunks = self._split_text_for_render(clean_text)
        translated_chunks: list[str] = []

        for chunk in chunks:
            chunk_result = await self._post_render_chunk(
                chunk, source_lang=source_lang, target_name=target_name
            )
            if chunk_result is None:
                return None
            translated_chunks.append(chunk_result)

        # Phase 3 Exit: Unified single return
        separator = "\n" if "\n" in clean_text else " "
        return separator.join(translated_chunks)

    async def _translate_narrative_fields_individually(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        has_short: bool,
        has_desc: bool,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None] | None:
        """Translate narrative fields one by one via Render API (auto-chunking long descriptions)."""
        tr_title = await self._translate_with_render_api(
            title, source_lang=source_lang, target_lang=target_lang
        )
        if tr_title is None:
            return None

        tr_short: str | None = None
        if has_short:
            tr_short = await self._translate_with_render_api(
                short_description or "",
                source_lang=source_lang,
                target_lang=target_lang,
            )
            if tr_short is None:
                return None

        tr_desc: str | None = None
        if has_desc:
            tr_desc = await self._translate_with_render_api(
                description or "",
                source_lang=source_lang,
                target_lang=target_lang,
            )
            if tr_desc is None:
                return None

        return {
            "title": tr_title,
            "short_description": tr_short,
            "description": tr_desc,
        }

    async def _translate_narrative_with_render_api(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None] | None:
        """Translate exhibit narrative via delimited batch for short payloads or chunked per-field for long payloads."""
        # Phase 1 Gate: Precondition check
        if not self.render_api_url:
            return None

        # Phase 2 Compute: Choose single batch (short) vs field-by-field chunking (long)
        has_short = bool(short_description and short_description.strip())
        has_desc = bool(description and description.strip())

        keys = ["title"]
        texts = [title]
        if has_short:
            keys.append("short_description")
            texts.append(short_description or "")
        if has_desc:
            keys.append("description")
            texts.append(description or "")

        combined_text = self.NARRATIVE_DELIMITER.join(texts)

        if len(combined_text) > RENDER_MAX_CHUNK_CHARS:
            return await self._translate_narrative_fields_individually(
                title=title,
                short_description=short_description,
                description=description,
                has_short=has_short,
                has_desc=has_desc,
                source_lang=source_lang,
                target_lang=target_lang,
            )

        translated_bundle: dict[str, str | None] | None = None
        should_fallback_individual = False

        try:
            translated_combined = await self._translate_with_render_api(
                combined_text, source_lang=source_lang, target_lang=target_lang
            )
            if translated_combined:
                raw_parts = translated_combined.split("<<<---POI_FIELD_BREAK--->>>")
                parts = [p.strip() for p in raw_parts]

                if len(parts) == len(keys):
                    res_title = parts[0]
                    cursor = 1
                    res_short = parts[cursor] if has_short else None
                    if has_short:
                        cursor += 1
                    res_desc = parts[cursor] if has_desc else None

                    translated_bundle = {
                        "title": res_title,
                        "short_description": res_short,
                        "description": res_desc,
                    }
                else:
                    should_fallback_individual = True
                    logger.warning(
                        "Render API delimiter split mismatch (got %d, expected %d). Falling back to field-by-field.",
                        len(parts),
                        len(keys),
                    )
        except Exception as exc:
            logger.warning(
                "Render API delimited narrative translation failed: %s.",
                exc,
            )

        # Only fall back to field-by-field when Render responded but corrupted the delimiter
        if translated_bundle is None and should_fallback_individual:
            translated_bundle = await self._translate_narrative_fields_individually(
                title=title,
                short_description=short_description,
                description=description,
                has_short=has_short,
                has_desc=has_desc,
                source_lang=source_lang,
                target_lang=target_lang,
            )

        # Phase 3 Exit: Single structured return
        return translated_bundle

    async def _translate_with_openrouter(
        self, text: str, source_lang: str, target_lang: str
    ) -> str | None:
        """Translate text using OpenRouter AI with historical museum persona (SISE Compliant)."""
        # Phase 1 Gate: Guard against missing key or model
        if not self.openrouter_key or not self.openrouter_key.strip():
            return None
        if not self.openrouter_model or not self.openrouter_model.strip():
            logger.info(
                "OpenRouter translation skipped: OPENROUTER_MODEL is not configured."
            )
            return None

        # Phase 2 Compute: Execute chat completion request
        client = await self._get_http_client(timeout=30.0)
        url = f"{self.openrouter_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://cuchitunnels.local",
            "X-Title": "Cu Chi Tunnels Audio Guide",
        }

        system_prompt = (
            "You are an expert museum and cultural heritage translator specializing in historical sites "
            "(specifically Vietnam's historic Cu Chi Tunnels - Địa đạo Củ Chi).\n"
            f"Translate the following text accurately from {source_lang} to {target_lang}.\n"
            "Preserve historical significance, military and cultural terminology, and maintain a dignified, "
            "engaging museum tour guide persona.\n"
            "Output ONLY the translated text without extra commentary, markdown quotes, or formatting."
        )

        payload = {
            "model": self.openrouter_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            "temperature": 0.2,
        }
        resolved_content: str | None = None

        for attempt in range(self.max_retries):
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices:
                        content_text = choices[0].get("message", {}).get("content", "")
                        candidate = content_text.strip()
                        if candidate:
                            logger.info(
                                "Successfully translated via OpenRouter (%s -> %s, model=%s)",
                                source_lang,
                                target_lang,
                                self.openrouter_model,
                            )
                            resolved_content = candidate
                            break
                elif response.status_code == 429:
                    logger.warning(
                        "OpenRouter rate limit (429) on attempt %d", attempt + 1
                    )
                else:
                    logger.warning(
                        "OpenRouter returned status %d on attempt %d: %s",
                        response.status_code,
                        attempt + 1,
                        response.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "OpenRouter translation failed on attempt %d: %s",
                    attempt + 1,
                    exc,
                )

            if attempt < self.max_retries - 1:
                await asyncio.sleep(self.base_delay * (2**attempt))

        # Phase 3 Exit: Single structured return
        return resolved_content

    async def _translate_narrative_with_openrouter(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        source_lang: str,
        target_lang: str,
    ) -> dict[str, str | None] | None:
        """Translate exhibit narrative fields in a single batched OpenRouter call (SISE Compliant)."""
        # Phase 1 Gate: Guard against missing key or model
        if not self.openrouter_key or not self.openrouter_key.strip():
            return None
        if not self.openrouter_model or not self.openrouter_model.strip():
            logger.info(
                "OpenRouter narrative translation skipped: OPENROUTER_MODEL is not configured."
            )
            return None

        # Phase 2 Compute: Execute structured JSON completion
        client = await self._get_http_client(timeout=30.0)
        url = f"{self.openrouter_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://cuchitunnels.local",
            "X-Title": "Cu Chi Tunnels Audio Guide",
        }

        input_data = {
            "title": title,
            "short_description": short_description or "",
            "description": description or "",
        }

        system_prompt = (
            "You are an expert museum and cultural heritage translator specializing in historical sites "
            "(specifically Vietnam's historic Cu Chi Tunnels - Địa đạo Củ Chi).\n"
            f"Translate the following exhibit fields accurately from {source_lang} to {target_lang}.\n"
            "Preserve historical significance, military and cultural terminology, and maintain a dignified, "
            "engaging museum tour guide persona.\n"
            "Output ONLY a valid parseable JSON object with keys 'title', 'short_description', 'description'. "
            "Do NOT include markdown quotes, markdown code fences, or any commentary."
        )

        payload = {
            "model": self.openrouter_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(input_data, ensure_ascii=False)},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }
        resolved_narrative: dict[str, str | None] | None = None

        for attempt in range(self.max_retries):
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices:
                        raw_content = choices[0].get("message", {}).get("content", "")
                        parsed = json.loads(raw_content)
                        if isinstance(parsed, dict) and "title" in parsed:
                            resolved_narrative = {
                                "title": parsed.get("title") or title,
                                "short_description": (
                                    parsed.get("short_description")
                                    if short_description
                                    else None
                                ),
                                "description": (
                                    parsed.get("description") if description else None
                                ),
                            }
                            logger.info(
                                "Successfully translated narrative via OpenRouter JSON mode (%s -> %s)",
                                source_lang,
                                target_lang,
                            )
                            break
                elif response.status_code == 429:
                    logger.warning(
                        "OpenRouter narrative rate limit (429) on attempt %d",
                        attempt + 1,
                    )
                else:
                    logger.warning(
                        "OpenRouter narrative returned status %d on attempt %d: %s",
                        response.status_code,
                        attempt + 1,
                        response.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "OpenRouter narrative batch failed on attempt %d: %s",
                    attempt + 1,
                    exc,
                )

            if attempt < self.max_retries - 1:
                await asyncio.sleep(self.base_delay * (2**attempt))

        # Phase 3 Exit: Single structured return
        return resolved_narrative

    async def translate_text(
        self,
        text: str,
        target_lang: str,
        source_lang: str = "vi",
    ) -> str:
        """Translate text through configurable provider cascade (render_api -> openrouter).

        US 04.4 - AC-04.4.1: Seamless multi-provider fault tolerance.
        """
        # Phase 1 Gate: Empty text check
        if not text or not text.strip():
            return ""

        # Phase 2 Compute: Cascade dispatch
        provider_map = {
            "render_api": lambda: self._translate_with_render_api(
                text, source_lang, target_lang
            ),
            "openrouter": lambda: self._translate_with_openrouter(
                text, source_lang, target_lang
            ),
        }

        effective_order = self._resolve_effective_order()
        logger.info(
            "Executing text translation cascade (%s -> %s) in order: %s",
            source_lang,
            target_lang,
            effective_order,
        )

        last_error: Exception | None = None
        translated_output: str | None = None

        for provider_name in effective_order:
            handler = provider_map.get(provider_name)
            if handler is None:
                continue
            logger.info(
                "Trying text translation provider '%s' (%s -> %s)",
                provider_name,
                source_lang,
                target_lang,
            )
            try:
                res = await handler()
                if res:
                    translated_output = res
                    break
            except TranslationError as te:
                last_error = te
                logger.warning(
                    "Provider '%s' raised TranslationError: %s", provider_name, te
                )
            except Exception as exc:
                last_error = exc
                logger.warning("Provider '%s' failed: %s", provider_name, exc)

        # Fallback to render_api if not in effective_order
        if translated_output is None and "render_api" not in effective_order:
            try:
                translated_output = await self._translate_with_render_api(
                    text, source_lang, target_lang
                )
            except Exception as exc:
                last_error = exc

        # Phase 3 Exit: Return translated text or raise TranslationError
        if translated_output is not None:
            return translated_output

        if last_error is not None:
            if isinstance(last_error, TranslationError):
                raise last_error
            raise TranslationError(
                f"Failed to translate text to '{target_lang}' after exhausting providers: {last_error}"
            ) from last_error

        raise TranslationError(
            f"All translation providers exhausted for text to '{target_lang}'"
        )

    async def translate_exhibit_narrative(
        self,
        title: str,
        short_description: str | None,
        description: str | None,
        target_lang: str,
        source_lang: str = "vi",
    ) -> dict[str, str | None]:
        """Translate all fields of an exhibit narrative in 1 batched request per tier.

        Cascade order configured via providers_order (default: render_api -> openrouter).
        """
        # Phase 1 Gate: Precondition check
        if not title or not title.strip():
            return {
                "title": "",
                "short_description": short_description,
                "description": description,
            }

        # Phase 2 Compute: Cascade dispatch
        narrative_map = {
            "render_api": lambda: self._translate_narrative_with_render_api(
                title, short_description, description, source_lang, target_lang
            ),
            "openrouter": lambda: self._translate_narrative_with_openrouter(
                title, short_description, description, source_lang, target_lang
            ),
        }

        effective_order = self._resolve_effective_order()
        logger.info(
            "Executing narrative translation cascade (%s -> %s) in order: %s",
            source_lang,
            target_lang,
            effective_order,
        )

        resolved_narrative: dict[str, str | None] | None = None

        for provider_name in effective_order:
            handler = narrative_map.get(provider_name)
            if handler is None:
                continue
            logger.info(
                "Trying narrative translation provider '%s' (%s -> %s)",
                provider_name,
                source_lang,
                target_lang,
            )
            try:
                result = await handler()
                if result is not None:
                    resolved_narrative = result
                    break
            except Exception as exc:
                logger.warning(
                    "Narrative batch translation failed for provider '%s': %s",
                    provider_name,
                    exc,
                )

        # Fallback to render_api if not in effective_order
        if resolved_narrative is None and "render_api" not in effective_order:
            resolved_narrative = await self._translate_narrative_with_render_api(
                title, short_description, description, source_lang, target_lang
            )

        # Phase 3 Exit: Return structured narrative dictionary or raise TranslationError
        if resolved_narrative is not None:
            return resolved_narrative

        raise TranslationError(
            f"All translation providers exhausted for narrative to '{target_lang}'"
        )
