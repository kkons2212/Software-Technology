"""Unit tests for the TTS regeneration orchestration."""

from contextlib import nullcontext
from pathlib import Path
from typing import ClassVar

import pytest
from fastapi import HTTPException

from app.services import tts_service as tts_service_module
from app.services.tts_service import TTSService


class FakeTTSClient:
    def __init__(self, *, failure=None, empty=False):
        self.failure = failure
        self.empty = empty
        self.arguments = None

    async def generate_audio(self, text: str, language_id: str, output_path: Path):
        self.arguments = (text, language_id, output_path)
        if self.failure:
            raise self.failure
        output_path.write_bytes(b"" if self.empty else b"mp3 bytes")


class FakeAudioRepository:
    persisted: ClassVar[list[tuple[str, str, int]]] = []
    persist_error = None
    generation_text = ("en", "Guide title", "Short text", "Narration body")

    def __init__(self, db):
        self.db = db

    def get_generation_text(self, stran_id):
        return self.generation_text

    def save_generated_audio(self, stran_id, audio_url, file_size, expected_text):
        if self.persist_error:
            raise self.persist_error
        self.persisted.append((stran_id, audio_url, file_size, expected_text))


@pytest.fixture(autouse=True)
def reset_repository_state(monkeypatch):
    FakeAudioRepository.persisted = []
    FakeAudioRepository.persist_error = None
    FakeAudioRepository.generation_text = (
        "en",
        "Guide title",
        "Short text",
        "Narration body",
    )
    monkeypatch.setattr(tts_service_module, "AudioRepository", FakeAudioRepository)


@pytest.mark.asyncio
async def test_regeneration_uses_separate_sessions_and_persists_ready_audio(
    tmp_path,
):
    session_count = 0

    def session_factory():
        nonlocal session_count
        session_count += 1
        return nullcontext(object())

    tts_client = FakeTTSClient()
    service = TTSService(session_factory, tmp_path, tts_client)

    result = await service.regenerate_audio("TR_TEST_01")

    assert session_count == 2
    assert tts_client.arguments[0] == "Guide title\n\nShort text\n\nNarration body"
    assert tts_client.arguments[1] == "en"
    assert result.status == "DRAFT"
    assert result.audio_status == "READY"
    assert result.audio_url.startswith("/static/audio/translation_")
    assert len(FakeAudioRepository.persisted) == 1
    assert next(tmp_path.glob("translation_*.mp3")).read_bytes() == b"mp3 bytes"


@pytest.mark.asyncio
async def test_tts_failure_returns_error_and_does_not_persist(tmp_path):
    service = TTSService(
        lambda: nullcontext(object()),
        tmp_path,
        FakeTTSClient(failure=RuntimeError("provider unavailable")),
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.regenerate_audio("TR_TEST_02")

    assert exc_info.value.status_code == 502
    assert FakeAudioRepository.persisted == []
    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_empty_tts_output_is_rejected(tmp_path):
    service = TTSService(
        lambda: nullcontext(object()),
        tmp_path,
        FakeTTSClient(empty=True),
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.regenerate_audio("TR_TEST_03")

    assert exc_info.value.status_code == 502
    assert FakeAudioRepository.persisted == []
    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_persistence_failure_removes_new_file_and_returns_error(tmp_path):
    FakeAudioRepository.persist_error = RuntimeError("database unavailable")
    service = TTSService(
        lambda: nullcontext(object()),
        tmp_path,
        FakeTTSClient(),
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.regenerate_audio("TR_TEST_04")

    assert exc_info.value.status_code == 500
    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_empty_translation_is_rejected_without_calling_tts(tmp_path):
    FakeAudioRepository.generation_text = ("en", "", None, None)
    tts_client = FakeTTSClient()
    service = TTSService(
        lambda: nullcontext(object()),
        tmp_path,
        tts_client,
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.regenerate_audio("TR_TEST_05")

    assert exc_info.value.status_code == 422
    assert tts_client.arguments is None
