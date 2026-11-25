"""Unit tests for DeepTranslatorClient integration adapter (US 04.4 - Auto_Translate & OpenRouter)."""

import json
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.integrations.deep_translator_client import (
    DeepTranslatorClient,
    TranslationError,
)


@pytest.fixture()
def mock_http():
    """Build mock AsyncClient for network isolation."""
    return MagicMock(spec=httpx.AsyncClient)


@pytest.fixture()
def client(mock_http):
    """Build client with mock HTTP client and fast backoff for unit tests."""
    return DeepTranslatorClient(
        render_api_url="https://test-render-api.example.com",
        render_timeout=70.0,
        cold_start_delay=0.001,
        openrouter_key="test-openrouter-key",
        openrouter_model="openrouter/free",
        max_retries=2,
        base_delay=0.001,
        http_client=mock_http,
    )


def test_client_initialization_defaults():
    """Verify DeepTranslatorClient initializes with expected default configuration."""
    client = DeepTranslatorClient()
    assert "translation-temporary.onrender.com" in client.render_api_url
    assert client.render_timeout == 70.0
    assert client.wakeup_timeout == 110.0
    assert client.cold_start_delay == 10.0
    assert "render_api" in client.providers_order
    assert "openrouter" in client.providers_order


def test_resolve_render_target_language():
    """Verify _resolve_render_target normalizes ISO language codes to canonical English names."""
    client = DeepTranslatorClient()
    assert client._resolve_render_target("en") == "English"
    assert client._resolve_render_target("EN") == "English"
    assert client._resolve_render_target("english") == "English"
    assert client._resolve_render_target("ja") == "Japanese"
    assert client._resolve_render_target("fr") == "French"
    assert client._resolve_render_target("de") == "German"
    assert client._resolve_render_target("es") == "Spanish"
    assert client._resolve_render_target("zh") == "Chinese"
    assert client._resolve_render_target("zh-cn") == "Chinese"
    assert client._resolve_render_target("ko") == "Korean"
    assert client._resolve_render_target("ru") == "Russian"
    assert client._resolve_render_target("unknown") == "unknown"


@pytest.mark.asyncio
async def test_should_return_empty_string_for_empty_or_whitespace_input(client):
    assert await client.translate_text("", target_lang="en") == ""
    assert await client.translate_text("   ", target_lang="en") == ""


@pytest.mark.asyncio
async def test_check_health_success(client, mock_http):
    """Verify check_health returns health payload on 200 OK."""
    resp_200 = MagicMock(
        status_code=200,
        json=lambda: {
            "status": "healthy",
            "ram_usage_mb": 182.4,
            "ram_limit_mb": 512.0,
            "ram_percent": 35.6,
        },
    )
    mock_http.get = AsyncMock(return_value=resp_200)

    health = await client.check_health()
    assert health is not None
    assert health["status"] == "healthy"
    assert health["ram_usage_mb"] == 182.4
    mock_http.get.assert_called_once_with("https://test-render-api.example.com/health")


@pytest.mark.asyncio
async def test_check_health_unreachable_returns_none(client, mock_http):
    """Verify check_health gracefully returns None on network exception."""
    mock_http.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

    health = await client.check_health()
    assert health is None


@pytest.mark.asyncio
async def test_translate_text_via_render_api_success(client, mock_http):
    """Verify primary translation succeeds using Render Live API."""
    resp_200 = MagicMock(
        status_code=200,
        json=lambda: {
            "original_text": "Địa đạo Củ Chi",
            "translated_text": "Cu Chi Tunnels",
            "target_language": "English",
            "latency_ms": 115.0,
        },
    )
    mock_http.post = AsyncMock(return_value=resp_200)

    result = await client.translate_text("Địa đạo Củ Chi", target_lang="en")
    assert result == "Cu Chi Tunnels"
    mock_http.post.assert_called_once_with(
        "https://test-render-api.example.com/translate",
        json={"text": "Địa đạo Củ Chi", "target": "English"},
    )


@pytest.mark.asyncio
async def test_translate_text_render_timeout_falls_back_to_openrouter(
    client, mock_http
):
    """Verify client seamlessly cascades to OpenRouter when Render API times out."""

    def mock_post(url, **kwargs):
        if "test-render-api.example.com" in url:
            raise httpx.TimeoutException("Render cold start timeout")
        if "openrouter.ai" in url:
            return MagicMock(
                status_code=200,
                json=lambda: {
                    "choices": [{"message": {"content": "Cu Chi Historical Tunnels"}}]
                },
            )
        return MagicMock(status_code=404)

    mock_http.post = AsyncMock(side_effect=mock_post)

    result = await client.translate_text("Địa đạo Củ Chi", target_lang="en")
    assert result == "Cu Chi Historical Tunnels"
    assert mock_http.post.call_count >= 2


@pytest.mark.asyncio
async def test_translate_narrative_via_render_api_delimited(client, mock_http):
    """Verify narrative bundle translation batches fields with delimiter on Render API."""
    delimited_response = (
        "Hoang Cam Stove"
        "\n<<<---POI_FIELD_BREAK--->>>\n"
        "Secret smokeless field cooker"
        "\n<<<---POI_FIELD_BREAK--->>>\n"
        "Unique military invention of the Cu Chi resistance fighters."
    )
    resp_200 = MagicMock(
        status_code=200,
        json=lambda: {
            "original_text": "...",
            "translated_text": delimited_response,
            "target_language": "English",
            "latency_ms": 220.0,
        },
    )
    mock_http.post = AsyncMock(return_value=resp_200)

    narrative = await client.translate_exhibit_narrative(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến giấu khói",
        description="Sáng chế độc đáo của quân dân Củ Chi.",
        target_lang="en",
    )

    assert narrative["title"] == "Hoang Cam Stove"
    assert narrative["short_description"] == "Secret smokeless field cooker"
    assert (
        narrative["description"]
        == "Unique military invention of the Cu Chi resistance fighters."
    )
    assert mock_http.post.call_count == 1


@pytest.mark.asyncio
async def test_translate_narrative_delimiter_mismatch_falls_back_to_individual_fields(
    client, mock_http
):
    """Verify client recovers by translating field-by-field when delimiter split count mismatches."""
    call_count = 0

    def mock_post(url, **kwargs):
        nonlocal call_count
        call_count += 1
        json_body = kwargs.get("json", {})
        text = json_body.get("text", "")

        # First call: delimited batch returns corrupted delimiter
        if call_count == 1:
            return MagicMock(
                status_code=200,
                json=lambda: {
                    "translated_text": "Hoang Cam Stove without delimiters",
                    "latency_ms": 100.0,
                },
            )
        # Subsequent individual field calls
        return MagicMock(
            status_code=200,
            json=lambda: {
                "translated_text": f"[TR] {text}",
                "latency_ms": 50.0,
            },
        )

    mock_http.post = AsyncMock(side_effect=mock_post)

    narrative = await client.translate_exhibit_narrative(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến giấu khói",
        description="Sáng chế độc đáo",
        target_lang="en",
    )

    assert narrative["title"] == "[TR] Bếp Hoàng Cầm"
    assert narrative["short_description"] == "[TR] Bếp dã chiến giấu khói"
    assert narrative["description"] == "[TR] Sáng chế độc đáo"
    assert call_count == 4  # 1 batch attempt + 3 individual calls


@pytest.mark.asyncio
async def test_translate_narrative_render_failure_falls_back_to_openrouter(
    client, mock_http
):
    """Verify narrative translation cascades to OpenRouter JSON mode when Render API fails."""
    openrouter_json = {
        "title": "Hoang Cam Field Stove",
        "short_description": "Smokeless cooker",
        "description": "Historical resistance cooking facility",
    }

    def mock_post(url, **kwargs):
        if "test-render-api.example.com" in url:
            return MagicMock(status_code=500, text="Internal Server Error")
        if "openrouter.ai" in url:
            return MagicMock(
                status_code=200,
                json=lambda: {
                    "choices": [{"message": {"content": json.dumps(openrouter_json)}}]
                },
            )
        return MagicMock(status_code=404)

    mock_http.post = AsyncMock(side_effect=mock_post)

    narrative = await client.translate_exhibit_narrative(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến",
        description="Bếp giấu khói",
        target_lang="en",
    )

    assert narrative["title"] == "Hoang Cam Field Stove"
    assert narrative["short_description"] == "Smokeless cooker"
    assert narrative["description"] == "Historical resistance cooking facility"


@pytest.mark.asyncio
async def test_should_raise_translation_error_when_all_providers_exhausted(
    client, mock_http
):
    """Verify TranslationError is raised when both Render API and OpenRouter fail."""
    mock_http.post = AsyncMock(return_value=MagicMock(status_code=500, text="Down"))

    with pytest.raises(TranslationError, match="All translation providers exhausted"):
        await client.translate_text("Xin chào", target_lang="en")


@pytest.mark.asyncio
async def test_get_http_client_isolates_timeouts_across_endpoints():
    """Verify health-check (5s) and OpenRouter (30s) clients do not overwrite Render (70s) timeout."""
    uninjected_client = DeepTranslatorClient(render_timeout=70.0)
    health_client = await uninjected_client._get_http_client(timeout=5.0)
    openrouter_client = await uninjected_client._get_http_client(timeout=30.0)
    render_client = await uninjected_client._get_http_client(timeout=70.0)

    try:
        assert health_client is not render_client
        assert openrouter_client is not render_client
        assert health_client.timeout.read == 5.0
        assert openrouter_client.timeout.read == 30.0
        assert render_client.timeout.read == 70.0
    finally:
        await health_client.aclose()
        await openrouter_client.aclose()
        await render_client.aclose()


@pytest.mark.asyncio
async def test_render_api_502_triggers_health_wakeup_and_retries_immediately(
    mocker, mock_http
):
    """Verify 502 triggers GET /health wake-up wait and immediately retries POST /translate."""
    sleep_spy = mocker.patch(
        "app.integrations.deep_translator_client.asyncio.sleep",
        new=AsyncMock(),
    )
    mock_http.get = AsyncMock(
        return_value=MagicMock(
            status_code=200,
            json=lambda: {"status": "ok", "current_ram_mb": 66.3},
        )
    )
    responses = [
        MagicMock(status_code=502, text="<html><title>502</title></html>"),
        MagicMock(
            status_code=200,
            json=lambda: {
                "translated_text": "Cu Chi Tunnels",
                "latency_ms": 180.0,
            },
        ),
    ]
    mock_http.post = AsyncMock(side_effect=responses)

    client = DeepTranslatorClient(
        render_api_url="https://test-render-api.example.com",
        render_timeout=70.0,
        cold_start_delay=10.0,
        openrouter_key="test-openrouter-key",
        providers_order=["render_api", "openrouter"],
        max_retries=3,
        base_delay=1.5,
        http_client=mock_http,
    )

    result = await client.translate_text("Địa đạo Củ Chi", target_lang="en")

    assert result == "Cu Chi Tunnels"
    assert mock_http.get.await_count == 1
    assert mock_http.get.call_args.args == (
        "https://test-render-api.example.com/health",
    )
    sleep_spy.assert_not_awaited()
    assert mock_http.post.call_count == 2
    assert "test-render-api.example.com" in mock_http.post.call_args_list[-1].args[0]


@pytest.mark.asyncio
async def test_render_api_502_wakeup_timeout_falls_back_to_openrouter(mock_http):
    """Verify failed /health wake-up breaks Render retries immediately and cascades to OpenRouter."""
    mock_http.get = AsyncMock(side_effect=httpx.TimeoutException("Wakeup timed out"))

    def mock_post(url, **kwargs):
        if "test-render-api.example.com" in url:
            return MagicMock(status_code=502, text="<html><title>502</title></html>")
        if "openrouter.ai" in url:
            return MagicMock(
                status_code=200,
                json=lambda: {
                    "choices": [{"message": {"content": "Cu Chi Fallback Tunnels"}}]
                },
            )
        return MagicMock(status_code=404)

    mock_http.post = AsyncMock(side_effect=mock_post)

    client = DeepTranslatorClient(
        render_api_url="https://test-render-api.example.com",
        render_timeout=70.0,
        cold_start_delay=0.001,
        openrouter_key="test-openrouter-key",
        providers_order=["render_api", "openrouter"],
        max_retries=3,
        base_delay=0.001,
        http_client=mock_http,
    )

    result = await client.translate_text("Địa đạo Củ Chi", target_lang="en")

    assert result == "Cu Chi Fallback Tunnels"
    assert mock_http.get.call_count == 1
    assert mock_http.post.call_count == 2


@pytest.mark.asyncio
async def test_openrouter_narrative_logs_warning_on_non_200_status(
    caplog, client, mock_http
):
    """Verify OpenRouter narrative logs explicit warning when HTTP status is not 200."""
    mock_http.post = AsyncMock(
        return_value=MagicMock(status_code=404, text='{"error":"model not found"}')
    )

    with caplog.at_level("WARNING"):
        res = await client._translate_narrative_with_openrouter(
            title="Bếp Hoàng Cầm",
            short_description=None,
            description=None,
            source_lang="vi",
            target_lang="en",
        )

    assert res is None
    assert "OpenRouter narrative returned status 404" in caplog.text


@pytest.mark.asyncio
async def test_long_narrative_uses_chunked_per_field_render_calls(client, mock_http):
    """Verify oversized narratives bypass delimiter batching and chunk long descriptions <= 500 chars."""
    sent_payloads: list[str] = []

    def mock_post(url, **kwargs):
        text = kwargs.get("json", {}).get("text", "")
        sent_payloads.append(text)
        return MagicMock(
            status_code=200,
            json=lambda: {"translated_text": f"[ZH] {text}", "latency_ms": 120.0},
        )

    mock_http.post = AsyncMock(side_effect=mock_post)

    long_desc = (
        "Địa đạo Củ Chi là hệ thống đường hầm lịch sử nổi tiếng của Việt Nam. " * 15
    ).strip()
    narrative = await client.translate_exhibit_narrative(
        title="Bến Dược",
        short_description="Khu di tích lịch sử",
        description=long_desc,
        target_lang="zh",
    )

    assert narrative["title"] == "[ZH] Bến Dược"
    assert narrative["short_description"] == "[ZH] Khu di tích lịch sử"
    assert narrative["description"] is not None
    assert len(sent_payloads) >= 4
    assert all(len(p) <= 500 for p in sent_payloads)
    assert all("POI_FIELD_BREAK" not in p for p in sent_payloads)


@pytest.mark.asyncio
async def test_batch_narrative_render_failure_does_not_retry_field_by_field(
    client, mock_http
):
    """Verify short narrative skips field-by-field retry when Render returns 500/None and goes to OpenRouter."""
    render_calls = 0

    def mock_post(url, **kwargs):
        nonlocal render_calls
        if "test-render-api.example.com" in url:
            render_calls += 1
            return MagicMock(status_code=500, text="Down")
        return MagicMock(
            status_code=200,
            json=lambda: {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "title": "Fallback Title",
                                    "short_description": "Fallback Short",
                                    "description": "Fallback Desc",
                                }
                            )
                        }
                    }
                ]
            },
        )

    mock_http.post = AsyncMock(side_effect=mock_post)

    narrative = await client.translate_exhibit_narrative(
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến",
        description="Mô tả ngắn",
        target_lang="zh",
    )

    assert narrative["title"] == "Fallback Title"
    assert (
        render_calls == client.max_retries
    )  # Only batch attempts, no extra per-field retries


@pytest.mark.asyncio
async def test_ensure_render_awake_polls_until_200(mocker, mock_http):
    """Verify ensure_render_awake retries 502 and returns True once /health responds 200."""
    mocker.patch(
        "app.integrations.deep_translator_client.asyncio.sleep",
        new=AsyncMock(),
    )
    mock_http.get = AsyncMock(
        side_effect=[
            MagicMock(status_code=502),
            MagicMock(
                status_code=200,
                json=lambda: {"status": "ok", "current_ram_mb": 72.5},
            ),
        ]
    )

    client = DeepTranslatorClient(
        render_api_url="https://test-render-api.example.com",
        wakeup_timeout=110.0,
        cold_start_delay=0.001,
        providers_order=["render_api", "openrouter"],
        http_client=mock_http,
    )

    awake = await client.ensure_render_awake()
    assert awake is True
    assert mock_http.get.call_count == 2


@pytest.mark.asyncio
async def test_ensure_render_awake_logs_warning_when_budget_exhausted(
    caplog, mock_http
):
    """Verify _wait_for_render_wakeup logs warning if 502 persists until wakeup_timeout expires."""
    mock_http.get = AsyncMock(return_value=MagicMock(status_code=502))

    client = DeepTranslatorClient(
        render_api_url="https://test-render-api.example.com",
        wakeup_timeout=0.05,
        cold_start_delay=0.03,
        providers_order=["render_api", "openrouter"],
        http_client=mock_http,
    )

    with caplog.at_level("WARNING"):
        awake = await client.ensure_render_awake()

    assert awake is False
    assert "exhausted budget" in caplog.text


@pytest.mark.asyncio
async def test_openrouter_rotates_immediately_on_429_and_pins_working_key(
    caplog, mocker, mock_http
):
    """Verify 429 on key #1 switches immediately to key #2 without sleeping and pins key #2."""
    sleep_spy = mocker.patch(
        "app.integrations.deep_translator_client.asyncio.sleep",
        new=AsyncMock(),
    )
    used_auth_headers: list[str] = []

    def mock_post(url, **kwargs):
        auth = kwargs.get("headers", {}).get("Authorization", "")
        used_auth_headers.append(auth)
        if auth == "Bearer secret-key-1":
            return MagicMock(
                status_code=429,
                headers={"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1700000"},
                text="rate limited",
            )
        return MagicMock(
            status_code=200,
            json=lambda: {"choices": [{"message": {"content": "Cu Chi Tunnels"}}]},
        )

    mock_http.post = AsyncMock(side_effect=mock_post)
    client = DeepTranslatorClient(
        openrouter_key="secret-key-1, secret-key-2",
        providers_order=["openrouter"],
        max_retries=2,
        http_client=mock_http,
    )

    with caplog.at_level("WARNING"):
        res1 = await client.translate_text("Địa đạo Củ Chi", target_lang="en")
        res2 = await client.translate_text("Bến Dược", target_lang="en")

    assert res1 == "Cu Chi Tunnels"
    assert res2 == "Cu Chi Tunnels"
    assert used_auth_headers == [
        "Bearer secret-key-1",
        "Bearer secret-key-2",
        "Bearer secret-key-2",
    ]
    sleep_spy.assert_not_awaited()
    assert "remaining=0" in caplog.text
    assert "secret-key-1" not in caplog.text


@pytest.mark.asyncio
async def test_openrouter_rotates_on_402_credit_and_403_budget_limits(
    caplog, mocker, mock_http
):
    """Verify 402 (credit limit) and 403 (budget limit) rotate across keys in narrative JSON mode."""
    sleep_spy = mocker.patch(
        "app.integrations.deep_translator_client.asyncio.sleep",
        new=AsyncMock(),
    )
    used_auth_headers: list[str] = []

    def mock_post(url, **kwargs):
        auth = kwargs.get("headers", {}).get("Authorization", "")
        used_auth_headers.append(auth)
        if auth == "Bearer key-credit-empty":
            return MagicMock(
                status_code=402,
                json=lambda: {
                    "error": {
                        "message": "Insufficient credits",
                        "metadata": {"limit_source": "key_credit_limit"},
                    }
                },
                text="Insufficient credits",
            )
        if auth == "Bearer key-budget-hit":
            return MagicMock(
                status_code=403,
                json=lambda: {
                    "error": {
                        "message": "Budget exceeded",
                        "metadata": {"budget_type": "workspace"},
                    }
                },
                text="Budget exceeded",
            )
        return MagicMock(
            status_code=200,
            json=lambda: {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "title": "Hoang Cam Stove",
                                    "short_description": "Smokeless stove",
                                    "description": "Historical cooker",
                                }
                            )
                        }
                    }
                ]
            },
        )

    mock_http.post = AsyncMock(side_effect=mock_post)
    client = DeepTranslatorClient(
        openrouter_key="key-credit-empty,key-budget-hit,key-healthy",
        providers_order=["openrouter"],
        max_retries=2,
        http_client=mock_http,
    )

    with caplog.at_level("WARNING"):
        res = await client.translate_exhibit_narrative(
            title="Bếp Hoàng Cầm",
            short_description="Bếp không khói",
            description="Bếp dã chiến lịch sử",
            target_lang="en",
        )

    assert res["title"] == "Hoang Cam Stove"
    assert used_auth_headers == [
        "Bearer key-credit-empty",
        "Bearer key-budget-hit",
        "Bearer key-healthy",
    ]
    sleep_spy.assert_not_awaited()
    assert "limit_source=key_credit_limit" in caplog.text
    assert "key-credit-empty" not in caplog.text


@pytest.mark.asyncio
async def test_openrouter_stops_early_when_all_keys_hit_permanent_402_403(
    mocker, mock_http
):
    """Verify client does not waste backoff sleep when every key hits permanent 402/403."""
    sleep_spy = mocker.patch(
        "app.integrations.deep_translator_client.asyncio.sleep",
        new=AsyncMock(),
    )
    mock_http.post = AsyncMock(
        side_effect=[
            MagicMock(status_code=402, text="No credit"),
            MagicMock(status_code=403, text="Budget spent"),
        ]
    )
    client = DeepTranslatorClient(
        openrouter_key="k1,k2",
        providers_order=["openrouter"],
        max_retries=3,
        http_client=mock_http,
    )

    res = await client._translate_with_openrouter("Xin chào", "vi", "en")

    assert res is None
    assert mock_http.post.call_count == 2
    sleep_spy.assert_not_awaited()
