"""Asynchronous adapter for Microsoft's Edge neural text-to-speech service."""

from pathlib import Path
from typing import ClassVar

import edge_tts


class EdgeTTSClient:
    """Generate an MP3 narration using the voice mapped to a language code."""

    VOICE_BY_LANGUAGE: ClassVar[dict[str, str]] = {
        "en": "en-US-AriaNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural",
        "zh": "zh-CN-XiaoxiaoNeural",
        "vi": "vi-VN-HoaiMyNeural",
    }

    async def generate_audio(
        self,
        text: str,
        language_id: str,
        output_path: Path,
    ) -> None:
        """Synthesize speech to the given path without blocking the event loop."""
        voice = self.VOICE_BY_LANGUAGE.get(language_id.lower())
        if voice is None:
            raise ValueError(f"No Edge-TTS voice is configured for '{language_id}'.")

        communicator = edge_tts.Communicate(text=text, voice=voice)
        await communicator.save(str(output_path))
