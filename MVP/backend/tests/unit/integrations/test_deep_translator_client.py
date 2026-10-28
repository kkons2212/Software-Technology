"""Unit tests for DeepTranslatorClient integration adapter (US 04.4 - TSK-04.4.1)."""

import pytest

from app.integrations.deep_translator_client import (
    DeepTranslatorClient,
    TranslationError,
)


@pytest.fixture()
def client():
    """Build client with minimal backoff delay for fast test execution."""
    return DeepTranslatorClient(max_retries=3, base_delay=0.001, chunk_size=100)


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
    # client.chunk_size is 100
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
        side_effect=lambda text,
        target_lang,
        source_lang="vi": f"{text} in {target_lang}",
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
