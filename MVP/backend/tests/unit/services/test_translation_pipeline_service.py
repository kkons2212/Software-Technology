"""Unit tests for TranslationPipelineService and TranslationWorker (US 04.4 - TSK-04.4.1 & TSK-04.4.5)."""

from unittest.mock import AsyncMock

import pytest

from app.integrations.deep_translator_client import (
    DeepTranslatorClient,
    TranslationError,
)
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import (
    TRANSLATION_STATUS_DRAFT,
    TRANSLATION_STATUS_FAILED,
    POITranslation,
)
from app.services.audio_synthesis_worker import AudioSynthesisWorker
from app.services.translation_pipeline_service import (
    TranslationPipelineService,
    execute_poi_pipeline_background_task,
)
from app.services.translation_worker import TranslationWorker


def _seed_poi_with_vi_source(db_session):
    existing_langs = {lang.language_id for lang in db_session.query(LanguageCode).all()}
    for code, name in [
        ("vi", "Tiếng Việt"),
        ("en", "English"),
        ("ja", "Japanese"),
        ("ko", "Korean"),
        ("zh", "Chinese"),
    ]:
        if code not in existing_langs:
            db_session.add(LanguageCode(language_id=code, language_name=name))
    db_session.flush()

    poi = POI(
        poi_id="POI_PIPELINE_TEST",
        title="Bếp Hoàng Cầm",
        short_description="Bếp dã chiến bí mật",
        description="Chi tiết sáng chế bếp không khói thời chiến",
        latitude=11.1440,
        longitude=106.4635,
        radius=30,
        is_active=True,
    )
    db_session.add(poi)
    db_session.flush()

    tr_vi = POITranslation(
        stran_id="TR_VI_SOURCE_TEST",
        poi_id=poi.poi_id,
        language_id="vi",
        title=poi.title,
        short_description=poi.short_description,
        description=poi.description,
        status="PUBLISHED",
    )
    db_session.add(tr_vi)
    db_session.commit()
    return poi, tr_vi


@pytest.mark.asyncio
async def test_translation_worker_should_translate_and_set_draft_status(
    db_session, mocker
):
    poi, _ = _seed_poi_with_vi_source(db_session)

    mock_translator = mocker.MagicMock(spec=DeepTranslatorClient)
    mock_translator.translate_exhibit_narrative = AsyncMock(
        return_value={
            "title": "Hoang Cam Stove",
            "short_description": "Secret field kitchen",
            "description": "Details of the smokeless kitchen",
        }
    )

    worker = TranslationWorker(
        session_factory=lambda: db_session,
        translator_client=mock_translator,
    )

    success, stran_id = await worker.process_translation(poi.poi_id, target_lang="en")
    assert success is True
    assert stran_id is not None

    tr = db_session.query(POITranslation).filter_by(stran_id=stran_id).first()
    assert tr is not None
    assert tr.title == "Hoang Cam Stove"
    assert tr.status == TRANSLATION_STATUS_DRAFT
    assert tr.language_id == "en"


@pytest.mark.asyncio
async def test_translation_worker_should_mark_failed_when_translation_throws(
    db_session, mocker
):
    poi, _ = _seed_poi_with_vi_source(db_session)

    mock_translator = mocker.MagicMock(spec=DeepTranslatorClient)
    mock_translator.translate_exhibit_narrative = AsyncMock(
        side_effect=TranslationError("Translation service timeout")
    )

    worker = TranslationWorker(
        session_factory=lambda: db_session,
        translator_client=mock_translator,
    )

    success, stran_id = await worker.process_translation(poi.poi_id, target_lang="ja")
    assert success is False
    assert stran_id is not None

    tr = db_session.query(POITranslation).filter_by(stran_id=stran_id).first()
    assert tr is not None
    assert tr.status == TRANSLATION_STATUS_FAILED
    assert tr.language_id == "ja"


@pytest.mark.asyncio
async def test_translation_worker_returns_false_when_no_source_exists(db_session):
    worker = TranslationWorker(session_factory=lambda: db_session)
    success, stran_id = await worker.process_translation(
        "NON_EXISTENT_POI", target_lang="ko"
    )
    assert success is False
    assert stran_id is None


@pytest.mark.asyncio
async def test_pipeline_service_should_orchestrate_all_target_languages(
    db_session, mocker
):
    poi, _ = _seed_poi_with_vi_source(db_session)

    mock_trans_worker = mocker.MagicMock(spec=TranslationWorker)
    mock_trans_worker.process_translation = AsyncMock(
        side_effect=lambda poi_id, target_lang: (True, f"TR_{target_lang.upper()}")
    )

    mock_audio_worker = mocker.MagicMock(spec=AudioSynthesisWorker)
    mock_audio_worker.process_audio_synthesis = AsyncMock(return_value=True)

    pipeline = TranslationPipelineService(
        session_factory=lambda: db_session,
        translation_worker=mock_trans_worker,
        audio_worker=mock_audio_worker,
    )

    results = await pipeline.run_pipeline_for_poi(
        poi.poi_id, target_languages=["en", "ja", "ko", "zh"]
    )

    assert len(results) == 4
    for lang in ["en", "ja", "ko", "zh"]:
        assert results[lang]["translation"] is True
        assert results[lang]["audio"] is True

    assert mock_trans_worker.process_translation.call_count == 4
    assert mock_audio_worker.process_audio_synthesis.call_count == 4


@pytest.mark.asyncio
async def test_execute_poi_pipeline_background_task_catches_unhandled_exceptions(
    mocker,
):
    mocker.patch(
        "app.services.translation_pipeline_service.TranslationPipelineService.run_pipeline_for_poi",
        side_effect=Exception("Unexpected background error"),
    )

    # Must complete cleanly without raising unhandled exception
    await execute_poi_pipeline_background_task("POI_TEST_CRASH")


@pytest.mark.asyncio
async def test_pipeline_service_should_dynamically_load_languages_from_database(
    db_session, mocker
):
    poi, _ = _seed_poi_with_vi_source(db_session)
    if not db_session.query(LanguageCode).filter_by(language_id="fr").first():
        db_session.add(LanguageCode(language_id="fr", language_name="Français"))
        db_session.commit()

    processed_languages = []

    async def mock_process(poi_id, target_lang):
        processed_languages.append(target_lang)
        return True, f"TR_{target_lang.upper()}"

    mock_trans_worker = mocker.MagicMock(spec=TranslationWorker)
    mock_trans_worker.process_translation = AsyncMock(side_effect=mock_process)

    mock_audio_worker = mocker.MagicMock(spec=AudioSynthesisWorker)
    mock_audio_worker.process_audio_synthesis = AsyncMock(return_value=True)

    pipeline = TranslationPipelineService(
        session_factory=lambda: db_session,
        translation_worker=mock_trans_worker,
        audio_worker=mock_audio_worker,
    )

    results = await pipeline.run_pipeline_for_poi(poi.poi_id)

    assert "fr" in results
    assert "en" in results
    assert "vi" not in results
    assert "fr" in processed_languages
