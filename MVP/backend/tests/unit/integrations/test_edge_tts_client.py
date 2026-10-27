"""Unit tests for the Edge-TTS integration adapter."""

from unittest.mock import AsyncMock

import pytest

from app.integrations.edge_tts_client import EdgeTTSClient


@pytest.mark.asyncio
async def test_should_use_language_voice_and_save_to_requested_path(mocker, tmp_path):
    communicate = mocker.patch("app.integrations.edge_tts_client.edge_tts.Communicate")
    communicate.return_value.save = AsyncMock()
    output_path = tmp_path / "narration.mp3"

    await EdgeTTSClient().generate_audio(
        "Translated narration",
        "en",
        output_path,
    )

    communicate.assert_called_once_with(
        text="Translated narration",
        voice="en-US-AriaNeural",
    )
    communicate.return_value.save.assert_awaited_once_with(str(output_path))


@pytest.mark.asyncio
async def test_should_reject_language_without_a_configured_voice(tmp_path):
    with pytest.raises(ValueError, match="No Edge-TTS voice is configured"):
        await EdgeTTSClient().generate_audio("Narration", "fr", tmp_path / "fr.mp3")
