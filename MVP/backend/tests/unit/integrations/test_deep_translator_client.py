"""Unit tests for DeepTranslatorClient integration adapter (US 04.4 - TSK-04.4.1)."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.integrations.deep_translator_client import (
    DeepTranslatorClient,
    KeyPool,
    TranslationError,
)


@pytest.fixture()
def client():
    """Build client with minimal backoff delay and empty key pools for fast test execution."""
    return DeepTranslatorClient(
        gemini_keys=[],
        google_translate_keys=[],
        max_retries=3,
        base_delay=0.001,
        chunk_size=100,
    )


def test_key_pool_should_rotate_keys_in_circular_order():
    pool = KeyPool(["key1", "key2", "key3"])
    assert pool.has_keys() is True
    assert pool.get_next_key() == "key1"
    assert pool.get_next_key() == "key2"
    assert pool.get_next_key() == "key3"
    assert pool.get_next_key() == "key1"


def test_key_pool_handles_empty_or_whitespace_keys():
    pool = KeyPool(["  ", "", None])
    assert pool.has_keys() is False
    assert pool.get_next_key() is None


@pytest.mark.asyncio
async def test_should_return_empty_string_for_empty_or_whitespace_input(client):
    assert await client.translate_text("", target_lang="en") == ""
    assert await client.translate_text("   ", target_lang="en") == ""


@pytest.mark.asyncio
async def test_should_resolve_target_language_mapping(client):
    assert client._resolve_target_language("zh") == "zh-CN"
    assert client._resolve_target_language("ZH") == "zh-CN"
    assert client._resolve_target_language("en") == "en"
    assert client._resolve_target_language("ja") == "ja"
    assert client._resolve_target_language("ko") == "ko"
    assert client._resolve_target_language("fr") == "fr"


@pytest.mark.asyncio
async def test_should_translate_successfully_on_first_attempt(mocker, client):
    mocker.patch.object(
        client,
        "_translate_sync",
        return_value="Cu Chi Tunnels",
    )

    result = await client.translate_text("Địa đạo Củ Chi", target_lang="en")
    assert result == "Cu Chi Tunnels"
    client._translate_sync.assert_called_once_with(
        "Địa đạo Củ Chi",
        "vi",
        "en",
    )


@pytest.mark.asyncio
async def test_should_retry_with_exponential_backoff_and_recover(mocker, client):
    attempts = []

    def mock_translate_sync(text, source, target):
        attempts.append(1)
        if len(attempts) < 3:
            raise ConnectionError("Transient network failure")
        return "Recovered Translation"

    mocker.patch.object(client, "_translate_sync", side_effect=mock_translate_sync)

    result = await client.translate_text("Văn bản thử nghiệm", target_lang="en")
    assert result == "Recovered Translation"
    assert len(attempts) == 3


@pytest.mark.asyncio
async def test_should_raise_translation_error_when_retries_exhausted(mocker, client):
    mocker.patch.object(
        client,
        "_translate_sync",
        side_effect=ConnectionError("Persistent connection failure"),
    )

    with pytest.raises(TranslationError, match="Failed to translate text"):
        await client.translate_text("Văn bản lỗi", target_lang="en")


@pytest.mark.asyncio
async def test_should_chunk_and_reassemble_long_text(mocker, client):
    long_text = (
        "Đoạn văn thứ nhất dài vừa đủ để kiểm tra hệ thống.\n"
        "Đoạn văn thứ hai cũng dài vừa đủ tiếp theo để vượt qua ngưỡng giới hạn một trăm ký tự.\n"
        "Đoạn văn thứ ba kết thúc toàn bộ phần nội dung thử nghiệm."
    )
    mocker.patch.object(
        client,
        "_translate_sync",
        side_effect=lambda text, source, target: f"[TR] {text}",
    )

    result = await client.translate_text(long_text, target_lang="en")
    assert "[TR]" in result
    assert client._translate_sync.call_count >= 2


@pytest.mark.asyncio
async def test_should_translate_exhibit_narrative_fields(mocker, client):
    mocker.patch.object(
        client,
        "translate_text",
        side_effect=lambda text, target_lang, source_lang="vi": f"{text} in {target_lang}",
    )

    narrative = await client.translate_exhibit_narrative(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến giấu khói",
        description="Sáng chế bếp độc đáo thời kháng chiến",
        target_lang="ja",
    )

    assert narrative["title"] == "Bếp Hoàng Cầm in ja"
    assert narrative["short_description"] == "Bếp dã chiến giấu khói in ja"
    assert narrative["description"] == "Sáng chế bếp độc đáo thời kháng chiến in ja"


@pytest.mark.asyncio
async def test_should_translate_via_gemini_and_rotate_keys_on_rate_limit():
    mock_http = MagicMock(spec=httpx.AsyncClient)
    # First key gets 429 Rate Limit, Second key gets 200 with translation
    resp_429 = MagicMock(status_code=429, text="Rate limit exceeded")
    resp_200 = MagicMock(
        status_code=200,
        json=lambda: {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Hoang Cam smokeless stove - historic field stove"}
                        ]
                    }
                }
            ]
        },
    )
    mock_http.post = AsyncMock(side_effect=[resp_429, resp_200])

    client = DeepTranslatorClient(
        gemini_keys=["gemini_key_1", "gemini_key_2"],
        http_client=mock_http,
    )

    result = await client.translate_text("Bếp Hoàng Cầm", target_lang="en")
    assert result == "Hoang Cam smokeless stove - historic field stove"
    assert mock_http.post.call_count == 2
    # Check that both keys were queried
    first_url = mock_http.post.call_args_list[0][0][0]
    second_url = mock_http.post.call_args_list[1][0][0]
    assert "key=gemini_key_1" in first_url
    assert "key=gemini_key_2" in second_url


@pytest.mark.asyncio
async def test_should_fallback_from_gemini_to_google_cloud_on_error():
    mock_http = MagicMock(spec=httpx.AsyncClient)
    # Gemini fails with 500, Google Cloud succeeds with 200
    gemini_resp = MagicMock(status_code=500, text="Internal Gemini error")
    google_resp = MagicMock(
        status_code=200,
        json=lambda: {
            "data": {
                "translations": [{"translatedText": "Cu Chi Tunnels &amp; History"}]
            }
        },
    )
    mock_http.post = AsyncMock(side_effect=[gemini_resp, google_resp])

    client = DeepTranslatorClient(
        gemini_keys=["gemini_key_1"],
        google_translate_keys=["google_key_1"],
        http_client=mock_http,
    )

    result = await client.translate_text("Địa đạo Củ Chi", target_lang="en")
    # html.unescape should unescape &amp;
    assert result == "Cu Chi Tunnels & History"
    assert mock_http.post.call_count == 2


@pytest.mark.asyncio
async def test_should_fallback_to_free_translator_when_all_cloud_keys_fail(mocker):
    mock_http = MagicMock(spec=httpx.AsyncClient)
    # All cloud services return 500 error
    mock_http.post = AsyncMock(
        return_value=MagicMock(status_code=500, text="Quota exhausted")
    )

    client = DeepTranslatorClient(
        gemini_keys=["gemini_key_1"],
        google_translate_keys=["google_key_1"],
        http_client=mock_http,
        max_retries=1,
    )

    mocker.patch.object(
        client,
        "_translate_sync",
        return_value="Free fallback translation result",
    )

    result = await client.translate_text("Địa đạo", target_lang="en")
    assert result == "Free fallback translation result"
    client._translate_sync.assert_called_once()
