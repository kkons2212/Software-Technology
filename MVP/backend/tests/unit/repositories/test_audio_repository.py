"""Unit tests for audio metadata persistence and translation status updates."""

import uuid

import pytest

from app.core.exceptions import ApiError
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation
from app.repositories.audio_repository import AudioRepository


def _create_translation(db_session, status="NEEDS_UPDATE"):
    language = db_session.get(LanguageCode, "en")
    if language is None:
        db_session.add(LanguageCode(language_id="en", language_name="English"))

    poi_id = f"POI_{uuid.uuid4().hex[:12].upper()}"
    translation_id = f"TR_{uuid.uuid4().hex[:12].upper()}"
    poi = POI(
        poi_id=poi_id,
        title="Museum exhibit",
        latitude=11.1442,
        longitude=106.4632,
        radius=25,
        is_active=True,
    )
    translation = POITranslation(
        stran_id=translation_id,
        poi_id=poi_id,
        language_id="en",
        title="Exhibit narration",
        short_description="Short narration",
        description="Full narration text.",
        status=status,
    )
    db_session.add_all([poi, translation])
    db_session.commit()
    return translation


def test_should_create_audio_and_reset_translation_to_draft(db_session):
    translation = _create_translation(db_session)

    AudioRepository(db_session).save_generated_audio(
        translation.stran_id,
        "/static/audio/new-narration.mp3",
        2048,
        ("Exhibit narration", "Short narration", "Full narration text."),
    )

    db_session.refresh(translation)
    assert translation.status == "DRAFT"
    assert translation.audio_url == "/static/audio/new-narration.mp3"
    assert translation.file_size == 2048
    assert translation.audio is not None
    assert translation.audio.status == "READY"


def test_should_replace_audio_metadata_without_creating_a_second_record(db_session):
    translation = _create_translation(db_session, status="DRAFT")
    repository = AudioRepository(db_session)
    repository.save_generated_audio(
        translation.stran_id,
        "/static/audio/first.mp3",
        1024,
        ("Exhibit narration", "Short narration", "Full narration text."),
    )
    db_session.refresh(translation)
    assert translation.audio_url == "/static/audio/first.mp3"
    assert translation.file_size == 1024

    repository.save_generated_audio(
        translation.stran_id,
        "/static/audio/second.mp3",
        4096,
        ("Exhibit narration", "Short narration", "Full narration text."),
    )

    db_session.refresh(translation)
    assert translation.audio_url == "/static/audio/second.mp3"
    assert translation.file_size == 4096


def test_should_not_mark_audio_ready_if_translation_changed_during_generation(
    db_session,
):
    translation = _create_translation(db_session)
    repository = AudioRepository(db_session)
    previous_text = (
        translation.title,
        translation.short_description,
        translation.description,
    )
    repository.save_generated_audio(
        translation.stran_id,
        "/static/audio/current.mp3",
        1024,
        previous_text,
    )
    db_session.refresh(translation)
    assert translation.audio_url == "/static/audio/current.mp3"

    translation.description = "Newer narration text."
    translation.status = "NEEDS_UPDATE"
    db_session.commit()

    with pytest.raises(ApiError) as exc_info:
        repository.save_generated_audio(
            translation.stran_id,
            "/static/audio/stale-narration.mp3",
            2048,
            previous_text,
        )

    assert exc_info.value.status_code == 409
    assert translation.status == "NEEDS_UPDATE"
    db_session.refresh(translation)
    assert translation.audio_url == "/static/audio/current.mp3"


def test_should_return_generation_text_for_translation(db_session):
    translation = _create_translation(db_session)

    text = AudioRepository(db_session).get_generation_text(translation.stran_id)

    assert text == (
        "en",
        "Exhibit narration",
        "Short narration",
        "Full narration text.",
    )


def test_should_return_not_found_for_missing_translation(db_session):
    with pytest.raises(ApiError) as exc_info:
        AudioRepository(db_session).get_generation_text("TR_MISSING")

    assert exc_info.value.status_code == 404
