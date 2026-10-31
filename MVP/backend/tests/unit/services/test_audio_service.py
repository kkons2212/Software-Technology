"""Unit tests for AudioSynthesisWorker and audio service business logic (US 04.4 - TSK-04.4.2 & TSK-04.4.3)."""

from unittest.mock import AsyncMock

import pytest

from app.integrations.edge_tts_client import EdgeTTSClient
from app.models.audio import AUDIO_STATUS_READY
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import (
    TRANSLATION_STATUS_DRAFT,
    TRANSLATION_STATUS_NEEDS_UPDATE,
    POITranslation,
)
from app.services.audio_synthesis_worker import AudioSynthesisWorker


def _seed_test_translation(
    db_session, lang="en", title="Cu Chi Tunnel", desc="Narrative"
):
    existing_langs = {
        lang_obj.language_id for lang_obj in db_session.query(LanguageCode).all()
    }
    if lang not in existing_langs:
        db_session.add(LanguageCode(language_id=lang, language_name=lang.upper()))
        db_session.flush()

    poi = POI(
        poi_id=f"POI_{lang.upper()}_TEST",
        title=title,
        short_description="Short desc",
        description=desc,
        latitude=11.1440,
        longitude=106.4635,
        radius=30,
        is_active=True,
    )
    db_session.add(poi)
    db_session.flush()

    tr = POITranslation(
        stran_id=f"TR_{lang.upper()}_TEST",
        poi_id=poi.poi_id,
        language_id=lang,
        title=title,
        short_description="Short desc",
        description=desc,
        status="PENDING",
    )
    db_session.add(tr)
    db_session.commit()
    return tr


@pytest.mark.asyncio
async def test_should_synthesize_audio_and_persist_ready_status(
    db_session, tmp_path, mocker
):
    tr = _seed_test_translation(
        db_session, lang="en", title="Cu Chi History", desc="Detailed story"
    )
    stran_id = tr.stran_id

    mock_tts = mocker.MagicMock(spec=EdgeTTSClient)
    mock_tts.synthesize_or_reuse = AsyncMock(
        return_value=("/static/audio/test_audio.mp3", 1024, False)
    )

    worker = AudioSynthesisWorker(
        session_factory=lambda: db_session,
        audio_dir=tmp_path,
        tts_client=mock_tts,
    )

    success = await worker.process_audio_synthesis(stran_id)
    assert success is True

    # Verify DB record updated on POITranslation
    updated_tr = db_session.query(POITranslation).filter_by(stran_id=stran_id).first()
    assert updated_tr is not None
    assert updated_tr.status == TRANSLATION_STATUS_DRAFT
    assert updated_tr.audio_url == "/static/audio/test_audio.mp3"
    assert updated_tr.file_size == 1024
    assert updated_tr.audio is not None
    assert updated_tr.audio.status == AUDIO_STATUS_READY


@pytest.mark.asyncio
async def test_should_handle_audio_cache_hit_and_reuse_file(
    db_session, tmp_path, mocker
):
    tr = _seed_test_translation(
        db_session, lang="ja", title="Bếp Hoàng Cầm", desc="Mô tả bếp"
    )
    stran_id = tr.stran_id

    mock_tts = mocker.MagicMock(spec=EdgeTTSClient)
    mock_tts.synthesize_or_reuse = AsyncMock(
        return_value=("/static/audio/cached_audio.mp3", 2048, True)
    )

    worker = AudioSynthesisWorker(
        session_factory=lambda: db_session,
        audio_dir=tmp_path,
        tts_client=mock_tts,
    )

    success = await worker.process_audio_synthesis(stran_id)
    assert success is True

    updated_tr = db_session.query(POITranslation).filter_by(stran_id=stran_id).first()
    assert updated_tr is not None
    assert updated_tr.audio_url == "/static/audio/cached_audio.mp3"
    assert updated_tr.audio is not None
    assert updated_tr.audio.status == AUDIO_STATUS_READY


@pytest.mark.asyncio
async def test_should_mark_failed_and_needs_update_on_synthesis_error(
    db_session, tmp_path, mocker
):
    tr = _seed_test_translation(
        db_session, lang="ko", title="Korean Title", desc="Korean Desc"
    )
    stran_id = tr.stran_id

    mock_tts = mocker.MagicMock(spec=EdgeTTSClient)
    mock_tts.synthesize_or_reuse = AsyncMock(
        side_effect=RuntimeError("Edge-TTS connection lost")
    )

    worker = AudioSynthesisWorker(
        session_factory=lambda: db_session,
        audio_dir=tmp_path,
        tts_client=mock_tts,
    )

    success = await worker.process_audio_synthesis(stran_id)
    assert success is False

    updated_tr = db_session.query(POITranslation).filter_by(stran_id=stran_id).first()
    assert updated_tr is not None
    assert updated_tr.status == TRANSLATION_STATUS_NEEDS_UPDATE


@pytest.mark.asyncio
async def test_should_skip_synthesis_for_empty_narrative(db_session, tmp_path):
    tr = _seed_test_translation(db_session, lang="zh", title="  ", desc="   ")
    stran_id = tr.stran_id
    tr.short_description = ""
    db_session.commit()

    worker = AudioSynthesisWorker(
        session_factory=lambda: db_session,
        audio_dir=tmp_path,
    )

    success = await worker.process_audio_synthesis(stran_id)
    assert success is False
