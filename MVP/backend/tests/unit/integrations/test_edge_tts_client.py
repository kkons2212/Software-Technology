"""Unit tests for the Edge-TTS integration adapter (US 04.2 & US 04.4)."""

from unittest.mock import AsyncMock

import pytest

from app.integrations.edge_tts_client import EdgeTTSClient, compute_audio_hash


@pytest.fixture(autouse=True)
def reset_voice_cache():
    """Reset EdgeTTSClient discovered voice cache before each test."""
    EdgeTTSClient._DISCOVERED_VOICES.clear()
    EdgeTTSClient._DISCOVERED_VOICE_LISTS.clear()
    EdgeTTSClient._ALL_VOICES_CACHE = None
    yield
    EdgeTTSClient._DISCOVERED_VOICES.clear()
    EdgeTTSClient._DISCOVERED_VOICE_LISTS.clear()
    EdgeTTSClient._ALL_VOICES_CACHE = None


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
async def test_should_dynamically_discover_voice_for_unconfigured_language(mocker):
    client = EdgeTTSClient()
    mock_voices = [
        {"Locale": "it-IT", "ShortName": "it-IT-DiegoNeural", "Gender": "Male"},
        {"Locale": "it-IT", "ShortName": "it-IT-ElsaNeural", "Gender": "Female"},
    ]
    mock_list = mocker.patch(
        "app.integrations.edge_tts_client.edge_tts.list_voices",
        new=AsyncMock(return_value=mock_voices),
    )

    # First lookup should invoke edge_tts.list_voices()
    voice = await client.resolve_voice("it")
    assert voice == "it-IT-ElsaNeural"
    mock_list.assert_awaited_once()

    # Second lookup should hit in-memory cache and NOT call edge_tts.list_voices() again
    mock_list.reset_mock()
    cached_voice = await client.resolve_voice("it")
    assert cached_voice == "it-IT-ElsaNeural"
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_should_not_collide_short_language_prefix_with_longer_iso_code(mocker):
    """Verify 'fi' matches 'fi-FI' and never accidentally matches 'fil-PH'."""
    client = EdgeTTSClient()
    mock_voices = [
        {"Locale": "fil-PH", "ShortName": "fil-PH-BlessicaNeural", "Gender": "Female"},
        {"Locale": "fi-FI", "ShortName": "fi-FI-NooraNeural", "Gender": "Female"},
        {"Locale": "fi-FI", "ShortName": "fi-FI-HarriNeural", "Gender": "Male"},
    ]
    mocker.patch(
        "app.integrations.edge_tts_client.edge_tts.list_voices",
        new=AsyncMock(return_value=mock_voices),
    )

    voice = await client.resolve_voice("fi")
    assert voice == "fi-FI-NooraNeural"


def test_should_normalize_locale_variants_and_language_names():
    client = EdgeTTSClient()
    assert client.get_voice("vi") == "vi-VN-HoaiMyNeural"
    assert client.get_voice("Korean") == "ko-KR-SunHiNeural"
    assert client.get_voice("zh_CN") == "zh-CN-XiaoxiaoNeural"
    assert client.get_voice("zh-TW") == "zh-TW-HsiaoChenNeural"
    assert client.get_voice("de") == "de-DE-TanjaNeural"
    assert client.get_voice("es") == "es-ES-ElviraNeural"
    assert client.get_voice("ru") == "ru-RU-SvetlanaNeural"


@pytest.mark.asyncio
async def test_generate_audio_falls_back_to_secondary_native_voice_on_error(
    mocker, tmp_path
):
    """Verify generate_audio retries with secondary native voice when primary voice fails."""
    first_comm = mocker.MagicMock()
    first_comm.save = AsyncMock(side_effect=RuntimeError("NoAudioReceived"))
    second_comm = mocker.MagicMock()
    second_comm.save = AsyncMock()

    communicate = mocker.patch(
        "app.integrations.edge_tts_client.edge_tts.Communicate",
        side_effect=[first_comm, second_comm],
    )
    output_path = tmp_path / "ko_narration.mp3"

    await EdgeTTSClient().generate_audio("안녕하세요", "ko", output_path)

    assert communicate.call_count == 2
    assert communicate.call_args_list[0].kwargs == {
        "text": "안녕하세요",
        "voice": "ko-KR-SunHiNeural",
    }
    assert communicate.call_args_list[1].kwargs == {
        "text": "안녕하세요",
        "voice": "ko-KR-InJoonNeural",
    }
    second_comm.save.assert_awaited_once_with(str(output_path))


@pytest.mark.asyncio
async def test_generate_audio_falls_back_to_secondary_discovered_voice(
    mocker, tmp_path
):
    """Verify dynamically discovered languages also retry with their secondary voice."""
    mock_voices = [
        {"Locale": "th-TH", "ShortName": "th-TH-PremwadeeNeural", "Gender": "Female"},
        {"Locale": "th-TH", "ShortName": "th-TH-NiwatNeural", "Gender": "Male"},
    ]
    mocker.patch(
        "app.integrations.edge_tts_client.edge_tts.list_voices",
        new=AsyncMock(return_value=mock_voices),
    )

    first_comm = mocker.MagicMock()
    first_comm.save = AsyncMock(side_effect=RuntimeError("NoAudioReceived"))
    second_comm = mocker.MagicMock()
    second_comm.save = AsyncMock()
    communicate = mocker.patch(
        "app.integrations.edge_tts_client.edge_tts.Communicate",
        side_effect=[first_comm, second_comm],
    )

    await EdgeTTSClient().generate_audio("สวัสดี", "th", tmp_path / "th.mp3")

    assert communicate.call_args_list[0].kwargs["voice"] == "th-TH-PremwadeeNeural"
    assert communicate.call_args_list[1].kwargs["voice"] == "th-TH-NiwatNeural"


@pytest.mark.asyncio
async def test_should_reject_language_without_a_configured_or_discovered_voice(
    mocker, tmp_path
):
    mocker.patch(
        "app.integrations.edge_tts_client.edge_tts.list_voices",
        new=AsyncMock(return_value=[]),
    )

    with pytest.raises(
        ValueError, match="No Edge-TTS voice is configured or available"
    ):
        await EdgeTTSClient().generate_audio(
            "Narration", "unknown-lang", tmp_path / "unknown.mp3"
        )


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
