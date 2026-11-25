"""Asynchronous adapter for Microsoft's Edge neural text-to-speech service with content hash deduplication."""

import hashlib
import logging
from pathlib import Path
from typing import ClassVar

import edge_tts

logger = logging.getLogger(__name__)


def _compute_sha256_hash(text: str) -> str:
    """Compute standard SHA-256 hex digest for given text string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_audio_hash(
    title: str,
    description: str | None,
    language_id: str,
    voice_id: str | None = None,
) -> str:
    """Compute deterministic SHA-256 content hash for narration audio deduplication.

    dev_rules Section 5.2 / AC-04.4.3:
    audio_hash = SHA256(title + "::" + description + "::" + language_code + "::" + voice_id)
    """
    voice = voice_id
    if not voice:
        try:
            voice = EdgeTTSClient().get_voice(language_id)
        except ValueError:
            voice = language_id.strip().lower()

    desc = (description or "").strip()
    tit = title.strip()
    lang = language_id.strip().lower()
    raw = f"{tit}::{desc}::{lang}::{voice}"
    return _compute_sha256_hash(raw)


class EdgeTTSClient:
    """Generate an MP3 narration using the voice mapped to a language code."""

    LANGUAGE_ALIASES: ClassVar[dict[str, str]] = {
        "vietnamese": "vi",
        "english": "en",
        "japanese": "ja",
        "korean": "ko",
        "chinese": "zh",
        "french": "fr",
        "german": "de",
        "spanish": "es",
        "russian": "ru",
    }

    # Curated neural voices verified against Microsoft Edge-TTS live catalog
    VOICE_BY_LANGUAGE: ClassVar[dict[str, str]] = {
        "en": "en-US-AriaNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural",
        "zh": "zh-CN-XiaoxiaoNeural",
        "zh-cn": "zh-CN-XiaoxiaoNeural",
        "zh-tw": "zh-TW-HsiaoChenNeural",
        "vi": "vi-VN-HoaiMyNeural",
        "fr": "fr-FR-DeniseNeural",
        "de": "de-DE-TanjaNeural",
        "es": "es-ES-ElviraNeural",
        "ru": "ru-RU-SvetlanaNeural",
    }

    # Secondary native voices used automatically if the primary voice fails (e.g. NoAudioReceived)
    FALLBACK_VOICE_BY_LANGUAGE: ClassVar[dict[str, str]] = {
        "en": "en-US-GuyNeural",
        "ja": "ja-JP-KeitaNeural",
        "ko": "ko-KR-InJoonNeural",
        "zh": "zh-CN-YunxiNeural",
        "zh-cn": "zh-CN-YunxiNeural",
        "zh-tw": "zh-TW-YunJheNeural",
        "vi": "vi-VN-NamMinhNeural",
        "fr": "fr-FR-HenriNeural",
        "de": "de-DE-ChristophNeural",
        "es": "es-ES-AlvaroNeural",
        "ru": "ru-RU-DmitryNeural",
    }

    _DISCOVERED_VOICES: ClassVar[dict[str, str]] = {}
    _DISCOVERED_VOICE_LISTS: ClassVar[dict[str, list[str]]] = {}
    _ALL_VOICES_CACHE: ClassVar[list[dict] | None] = None

    def _normalize_language_code(self, language_id: str) -> str:
        """Normalize locale/language identifiers (lowercase, '_' -> '-', resolve full names)."""
        normalized = language_id.strip().lower().replace("_", "-")
        return self.LANGUAGE_ALIASES.get(normalized, normalized)

    def _resolve_voice_for_language(self, lang_code: str) -> str:
        """Helper to resolve configured voice synchronously."""
        return self.get_voice(lang_code)

    def get_voice(self, language_id: str) -> str:
        """Resolve voice identifier synchronously from curated map or discovered cache."""
        normalized = self._normalize_language_code(language_id)
        voice = self.VOICE_BY_LANGUAGE.get(normalized) or self._DISCOVERED_VOICES.get(
            normalized
        )
        if voice is None:
            prefix = normalized.split("-")[0]
            voice = self.VOICE_BY_LANGUAGE.get(prefix) or self._DISCOVERED_VOICES.get(
                prefix
            )

        if voice is None:
            raise ValueError(
                f"No Edge-TTS voice is configured or available for '{language_id}'."
            )
        return voice

    def _get_fallback_voice(self, language_id: str, primary_voice: str) -> str | None:
        """Return a secondary native voice for the same language if available."""
        normalized = self._normalize_language_code(language_id)
        prefix = normalized.split("-")[0]

        curated_fallback = self.FALLBACK_VOICE_BY_LANGUAGE.get(
            normalized
        ) or self.FALLBACK_VOICE_BY_LANGUAGE.get(prefix)
        if curated_fallback and curated_fallback != primary_voice:
            return curated_fallback

        discovered = self._DISCOVERED_VOICE_LISTS.get(
            normalized
        ) or self._DISCOVERED_VOICE_LISTS.get(prefix)
        if discovered:
            for candidate in discovered:
                if candidate != primary_voice:
                    return candidate
        return None

    async def resolve_voice(self, language_id: str) -> str:
        """Resolve voice identifier with dynamic Edge-TTS voice discovery and memory cache.

        1. Priority 1: Curated list (VOICE_BY_LANGUAGE) for evaluated museum persona.
        2. Priority 2: In-memory cache (_DISCOVERED_VOICES) of previously resolved voices.
        3. Priority 3: Dynamic discovery via edge_tts.list_voices(), matching exact locale
           or exact ISO-639 prefix (never colliding e.g. 'fi' with 'fil-PH').
        """
        try:
            return self.get_voice(language_id)
        except ValueError:
            pass

        normalized = self._normalize_language_code(language_id)
        prefix = normalized.split("-")[0]

        try:
            if EdgeTTSClient._ALL_VOICES_CACHE is None:
                EdgeTTSClient._ALL_VOICES_CACHE = await edge_tts.list_voices()

            all_voices = EdgeTTSClient._ALL_VOICES_CACHE or []
            exact_locale_matches = [
                v for v in all_voices if v.get("Locale", "").lower() == normalized
            ]
            prefix_matches = [
                v
                for v in all_voices
                if v.get("Locale", "").lower().split("-")[0] == prefix
            ]
            matches = exact_locale_matches or prefix_matches

            if matches:
                # Prefer exact requested locale or standard region (e.g. th-TH for th)
                standard_target = (
                    normalized if "-" in normalized else f"{prefix}-{prefix}"
                )
                pool = [
                    v for v in matches if v.get("Locale", "").lower() == standard_target
                ] or matches
                females = [v for v in pool if v.get("Gender") == "Female"]
                others = [v for v in pool if v not in females]
                ordered_names = [
                    v["ShortName"] for v in (females + others) if v.get("ShortName")
                ]

                if ordered_names:
                    voice_name = ordered_names[0]
                    EdgeTTSClient._DISCOVERED_VOICES[normalized] = voice_name
                    EdgeTTSClient._DISCOVERED_VOICE_LISTS[normalized] = ordered_names
                    if "-" not in normalized:
                        EdgeTTSClient._DISCOVERED_VOICES[prefix] = voice_name
                        EdgeTTSClient._DISCOVERED_VOICE_LISTS[prefix] = ordered_names
                    logger.info(
                        "Dynamically discovered Edge-TTS voice '%s' for language '%s'",
                        voice_name,
                        language_id,
                    )
                    return voice_name
        except Exception as exc:
            logger.warning(
                "Dynamic Edge-TTS voice discovery failed for '%s': %s",
                language_id,
                exc,
            )

        raise ValueError(
            f"No Edge-TTS voice is configured or available for '{language_id}'."
        )

    async def generate_audio(
        self,
        text: str,
        language_id: str,
        output_path: Path,
    ) -> None:
        """Synthesize speech using the target language voice, with secondary native voice fallback."""
        voice = await self.resolve_voice(language_id)
        logger.info(
            "Synthesizing Edge-TTS audio (lang=%s, voice=%s)", language_id, voice
        )
        try:
            communicator = edge_tts.Communicate(text=text, voice=voice)
            await communicator.save(str(output_path))
        except Exception as primary_exc:
            fallback_voice = self._get_fallback_voice(language_id, voice)
            if not fallback_voice:
                raise
            logger.warning(
                "Primary Edge-TTS voice '%s' failed for '%s' (%s); retrying with fallback voice '%s'",
                voice,
                language_id,
                primary_exc,
                fallback_voice,
            )
            fallback_communicator = edge_tts.Communicate(
                text=text, voice=fallback_voice
            )
            await fallback_communicator.save(str(output_path))

    async def synthesize_or_reuse(
        self,
        text: str,
        language_id: str,
        audio_dir: Path,
        audio_hash: str,
    ) -> tuple[str, int, bool]:
        """Synthesize MP3 narration or reuse existing cached file if SHA-256 matches.

        US 04.4 - AC-04.4.2 & AC-04.4.3: Prevents redundant TTS calls for identical content.
        Uses atomic file replacement via temporary file to guarantee file integrity.

        Returns:
            tuple[file_url, file_size_bytes, was_cached]
        """
        # Phase 1: Precondition Gate
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")
        if not language_id or not language_id.strip():
            raise ValueError("Language ID cannot be empty.")

        filename = f"audio_{audio_hash}.mp3"
        output_path = audio_dir / filename
        audio_url = f"/static/audio/{filename}"

        # Phase 2: Compute & Cache Check
        if output_path.is_file() and output_path.stat().st_size > 0:
            logger.info(
                "Audio cache hit for hash %s (%s). Reusing existing MP3 file.",
                audio_hash,
                language_id,
            )
            return audio_url, output_path.stat().st_size, True

        audio_dir.mkdir(parents=True, exist_ok=True)
        temporary_path = audio_dir / f".{filename}.tmp"
        try:
            await self.generate_audio(
                text=text,
                language_id=language_id,
                output_path=temporary_path,
            )
            if not temporary_path.is_file() or temporary_path.stat().st_size == 0:
                raise RuntimeError("Edge-TTS generated an empty audio file.")
            temporary_path.replace(output_path)
            file_size = output_path.stat().st_size
            # Phase 3: Unified Exit
            return audio_url, file_size, False
        finally:
            temporary_path.unlink(missing_ok=True)
