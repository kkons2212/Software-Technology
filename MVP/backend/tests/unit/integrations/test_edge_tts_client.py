"""Unit tests for the Edge-TTS integration adapter (US 04.2 & US 04.4)."""

from unittest.mock import AsyncMock

import pytest

from app.integrations.edge_tts_client import EdgeTTSClient, compute_audio_hash


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


def test_should_compute_deterministic_audio_hash():
    hash1 = compute_audio_hash(
        title="Địa đạo Củ Chi",
        description="Hệ thống địa đạo huyền thoại",
        language_id="vi",
    )
    hash2 = compute_audio_hash(
        title="Địa đạo Củ Chi",
        description="Hệ thống địa đạo huyền thoại",
        language_id="vi",
    )
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex string

    # Changing description alters hash
    hash3 = compute_audio_hash(
        title="Địa đạo Củ Chi",
        description="Hệ thống địa đạo đã thay đổi",
        language_id="vi",
    )
    assert hash1 != hash3


@pytest.mark.asyncio
async def test_should_reuse_existing_audio_file_when_cache_hits(tmp_path):
    client = EdgeTTSClient()
    audio_hash = "abcdef1234567890"
    cached_file = tmp_path / f"audio_{audio_hash}.mp3"
    cached_file.write_bytes(b"dummy mp3 audio content")

    url, size, is_reused = await client.synthesize_or_reuse(
        text="Sample text",
        language_id="en",
        audio_dir=tmp_path,
        audio_hash=audio_hash,
    )

    assert is_reused is True
    assert url == f"/static/audio/audio_{audio_hash}.mp3"
    assert size == len(b"dummy mp3 audio content")


@pytest.mark.asyncio
async def test_should_synthesize_when_cache_misses(mocker, tmp_path):
    client = EdgeTTSClient()
    audio_hash = "fresh_hash_987654321"

    async def mock_generate(text, language_id, output_path):
        output_path.write_bytes(b"newly generated mp3 bytes")

    mocker.patch.object(client, "generate_audio", side_effect=mock_generate)

    url, size, is_reused = await client.synthesize_or_reuse(
        text="New narration",
        language_id="en",
        audio_dir=tmp_path,
        audio_hash=audio_hash,
    )

    assert is_reused is False
    assert url == f"/static/audio/audio_{audio_hash}.mp3"
    assert size == len(b"newly generated mp3 bytes")
    assert (tmp_path / f"audio_{audio_hash}.mp3").is_file()
