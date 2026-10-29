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
    voice = voice_id or EdgeTTSClient.VOICE_BY_LANGUAGE.get(
        language_id.strip().lower(), ""
    )
    desc = (description or "").strip()
    tit = title.strip()
    lang = language_id.strip().lower()
    raw = f"{tit}::{desc}::{lang}::{voice}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class EdgeTTSClient:
    """Generate an MP3 narration using the voice mapped to a language code."""

    VOICE_BY_LANGUAGE: ClassVar[dict[str, str]] = {
        "en": "en-US-AriaNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural",
        "zh": "zh-CN-XiaoxiaoNeural",
        "vi": "vi-VN-HoaiMyNeural",
        "fr": "fr-FR-DeniseNeural",
    }

    def get_voice(self, language_id: str) -> str:
        """Resolve voice identifier for language code with prefix check and safe fallback."""
        normalized = language_id.strip().lower()
        voice = self.VOICE_BY_LANGUAGE.get(normalized)
        if voice is None:
            prefix = normalized.split("-")[0]
            voice = self.VOICE_BY_LANGUAGE.get(prefix)

        if voice is None:
            logger.warning(
                "No specific Edge-TTS voice configured for '%s', falling back to 'en-US-AriaNeural'",
                language_id,
            )
            return "en-US-AriaNeural"
        return voice

    async def generate_audio(
        self,
        text: str,
        language_id: str,
        output_path: Path,
    ) -> None:
        """Synthesize speech to the given path without blocking the event loop."""
        voice = self.get_voice(language_id)
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

        US 04.4 - AC-04.4.2 & AC-04.4.3:
        Returns:
            tuple[file_url, file_size_bytes, was_cached]
        """
        audio_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{audio_hash[:16]}_{language_id.lower()}.mp3"
        file_path = audio_dir / filename
        relative_url = f"/static/audio/{filename}"

        # AC-04.4.3: Check if identical content hash audio file already exists on disk
        if file_path.exists() and file_path.stat().st_size > 0:
            logger.info("Audio cache HIT for hash %s (%s)", audio_hash, relative_url)
            return relative_url, file_path.stat().st_size, True

        # Cache MISS: Synthesize fresh neural MP3 via EdgeTTS
        logger.info(
            "Audio cache MISS for hash %s, synthesizing via Edge-TTS (%s)",
            audio_hash,
            relative_url,
        )
        await self.generate_audio(
            text=text,
            language_id=language_id,
            output_path=file_path,
        )

        file_size = file_path.stat().st_size
        return relative_url, file_size, False
