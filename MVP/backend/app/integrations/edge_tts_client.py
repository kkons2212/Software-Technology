"""Asynchronous adapter for Microsoft's Edge neural text-to-speech service with content hash deduplication."""

import hashlib
import logging
from pathlib import Path
from typing import ClassVar

import edge_tts

logger = logging.getLogger(__name__)


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
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class EdgeTTSClient:
    """Generate an MP3 narration using the voice mapped to a language code."""

    # Curated high-quality neural voices evaluated for museum persona
    VOICE_BY_LANGUAGE: ClassVar[dict[str, str]] = {
        "en": "en-US-AriaNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural",
        "zh": "zh-CN-XiaoxiaoNeural",
        "vi": "vi-VN-HoaiMyNeural",
        "fr": "fr-FR-DeniseNeural",
    }

    _DISCOVERED_VOICES: ClassVar[dict[str, str]] = {}
    _ALL_VOICES_CACHE: ClassVar[list[dict] | None] = None

    def get_voice(self, language_id: str) -> str:
        """Resolve voice identifier synchronously from curated map or discovered cache."""
        normalized = language_id.strip().lower()
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

    async def resolve_voice(self, language_id: str) -> str:
        """Resolve voice identifier with dynamic Edge-TTS voice discovery and memory cache.

        1. Priority 1: Curated list (VOICE_BY_LANGUAGE) for evaluated museum persona.
        2. Priority 2: In-memory cache (_DISCOVERED_VOICES) of previously resolved voices.
        3. Priority 3: Dynamic discovery via edge_tts.list_voices(), picking standard regional
           or female neural voice matching language prefix.
        """
        try:
            return self.get_voice(language_id)
        except ValueError:
            pass

        normalized = language_id.strip().lower()
        prefix = normalized.split("-")[0]

        try:
            if EdgeTTSClient._ALL_VOICES_CACHE is None:
                EdgeTTSClient._ALL_VOICES_CACHE = await edge_tts.list_voices()

            matches = [
                v
                for v in (EdgeTTSClient._ALL_VOICES_CACHE or [])
                if v.get("Locale", "").lower().startswith(prefix)
            ]

            if matches:
                # Prefer standard region matching code (e.g. es-ES for es, de-DE for de)
                standard_target = f"{prefix}-{prefix}"
                pool = (
                    [
                        v
                        for v in matches
                        if v.get("Locale", "").lower() == standard_target
                    ]
                    or matches
                )
                # Prefer female voice persona if available
                females = [v for v in pool if v.get("Gender") == "Female"]
                chosen = (females or pool)[0]
                voice_name = chosen["ShortName"]

                EdgeTTSClient._DISCOVERED_VOICES[normalized] = voice_name
                EdgeTTSClient._DISCOVERED_VOICES[prefix] = voice_name
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
        """Synthesize speech to the given path without blocking the event loop."""
        voice = await self.resolve_voice(language_id)
        communicator = edge_tts.Communicate(text=text, voice=voice)
        await communicator.save(str(output_path))

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
        filename = f"audio_{audio_hash}.mp3"
        output_path = audio_dir / filename
        audio_url = f"/static/audio/{filename}"

        # 1. Check existing storage cache
        if output_path.is_file() and output_path.stat().st_size > 0:
            logger.info(
                "Audio cache hit for hash %s (%s). Reusing existing MP3 file.",
                audio_hash,
                language_id,
            )
            return audio_url, output_path.stat().st_size, True

        # 2. Synthesize new audio via Edge-TTS
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
            return audio_url, file_size, False
        finally:
            temporary_path.unlink(missing_ok=True)
