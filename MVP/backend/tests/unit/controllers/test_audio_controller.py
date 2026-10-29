"""Unit tests for audio regeneration and protected streaming endpoints (US 04.2, US 06.4)."""

from datetime import datetime, timedelta
from pathlib import Path

from app.core.config import get_settings
from app.core.dependencies import get_tts_service
from app.core.exceptions import ApiError
from app.main import app
from app.models.audio import AUDIO_STATUS_READY, POIAudio
from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.session import VisitorSession
from app.models.translation import POITranslation
from app.schemas.audio_schema import AudioRegenerationResponse


class FakeTTSService:
    async def regenerate_audio(self, stran_id: str) -> AudioRegenerationResponse:
        return AudioRegenerationResponse(
            stran_id=stran_id,
            status="DRAFT",
            audio_url="/static/audio/new_narration.mp3",
            audio_status="READY",
        )


class FailedTTSService:
    async def regenerate_audio(self, stran_id: str) -> AudioRegenerationResponse:
        raise ApiError(
            status_code=502,
            code="AUDIO_GENERATION_FAILED",
            message="Unable to generate Audio Guide, please try again later.",
        )


def test_should_regenerate_audio_and_return_draft_state(client):
    app.dependency_overrides[get_tts_service] = FakeTTSService

    response = client.post("/api/v1/admin/translations/TR_AUDIO_01/regenerate-audio")

    assert response.status_code == 200
    assert response.json() == {
        "stran_id": "TR_AUDIO_01",
        "status": "DRAFT",
        "audio_url": "/static/audio/new_narration.mp3",
        "audio_status": "READY",
    }


def test_should_return_generation_error_without_success_payload(client):
    app.dependency_overrides[get_tts_service] = FailedTTSService

    response = client.post("/api/v1/admin/translations/TR_AUDIO_01/regenerate-audio")

    assert response.status_code == 502
    assert response.json()["success"] is False
    assert response.json()["error"]["code"] == "AUDIO_GENERATION_FAILED"


# ==============================================================================
# US 06.4: AUDIO STREAMING AUTHORIZATION TESTS (TSK-06.4.1)
# ==============================================================================


def test_should_reject_streaming_when_unpaid_or_no_token_403(client, db_session):
    response = client.get("/api/v1/audio/POI_STREAM_TEST")
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONTENT_LOCKED"


def test_should_reject_streaming_when_token_invalid_403(client, db_session):
    response = client.get("/api/v1/audio/POI_STREAM_TEST?token=invalid_dummy_token")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CONTENT_LOCKED"


def test_should_reject_streaming_when_session_expired_403(client, db_session):
    # Expired session in database
    past = datetime.utcnow() - timedelta(hours=1)
    session = VisitorSession(
        SessionID="SES_EXPIRED_01",
        SessionCode="CCT-EXPIRE",
        SessionToken="expired_token_12345",
        Status="EXPIRED",
        Activate_at=past - timedelta(hours=24),
        Expire_at=past,
    )
    db_session.add(session)
    db_session.commit()

    response = client.get("/api/v1/audio/POI_STREAM_TEST?token=expired_token_12345")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CONTENT_LOCKED"


def test_should_stream_audio_when_active_session_token_provided_200(
    client, db_session, tmp_path
):
    # Seed Language
    if not db_session.query(LanguageCode).filter_by(language_id="vi").first():
        db_session.add(LanguageCode(language_id="vi", language_name="Tiếng Việt"))
        db_session.commit()

    # Seed active session
    session = VisitorSession(
        SessionID="SES_ACTIVE_STREAM",
        SessionCode="CCT-STREAM01",
        SessionToken="valid_stream_token_999",
        Status="ACTIVE",
        Activate_at=datetime.utcnow(),
        Expire_at=datetime.utcnow() + timedelta(hours=24),
    )
    db_session.add(session)

    # Seed POI & Translation & Audio
    poi = POI(
        poi_id="POI_STREAM_OK",
        title="Bếp Hoàng Cầm",
        short_description="Bếp giấu khói",
        description="Mô tả chi tiết bếp Hoàng Cầm",
        latitude=11.1440,
        longitude=106.4635,
        radius=30,
        is_active=True,
    )
    db_session.add(poi)
    db_session.flush()

    translation = POITranslation(
        stran_id="TR_STREAM_OK",
        poi_id=poi.poi_id,
        language_id="vi",
        title=poi.title,
        status="PUBLISHED",
    )
    db_session.add(translation)
    db_session.flush()

    # Create dummy MP3 file in static audio dir
    audio_dir = Path(get_settings().STATIC_DIR) / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    mp3_filename = "test_stream_audio.mp3"
    mp3_path = audio_dir / mp3_filename
    mp3_path.write_bytes(b"ID3\x03\x00\x00\x00\x00\x00#DUMMY_MP3_STREAM_CONTENT")

    audio = POIAudio(
        audio_id="AUD_STREAM_OK",
        stran_id=translation.stran_id,
        audio_url=f"/static/audio/{mp3_filename}",
        file_size=30,
        status=AUDIO_STATUS_READY,
    )
    db_session.add(audio)
    db_session.commit()

    # 1. Test via query param token
    res1 = client.get("/api/v1/audio/POI_STREAM_OK?token=valid_stream_token_999")
    assert res1.status_code == 200
    assert "audio/mpeg" in res1.headers.get("content-type", "")

    # 2. Test via X-Session-Token header
    res2 = client.get(
        "/api/v1/audio/POI_STREAM_OK",
        headers={"X-Session-Token": "valid_stream_token_999"},
    )
    assert res2.status_code == 200

    # 3. Test alias endpoint /api/v1/audio/stream/{poi_id}
    res3 = client.get("/api/v1/audio/stream/POI_STREAM_OK?token=valid_stream_token_999")
    assert res3.status_code == 200

    # Cleanup temporary file
    if mp3_path.exists():
        mp3_path.unlink()


def test_should_return_404_when_audio_not_found_for_valid_session(client, db_session):
    # Active session
    session = VisitorSession(
        SessionID="SES_ACTIVE_404",
        SessionCode="CCT-S404",
        SessionToken="token_404_active",
        Status="ACTIVE",
        Activate_at=datetime.utcnow(),
        Expire_at=datetime.utcnow() + timedelta(hours=24),
    )
    db_session.add(session)
    db_session.commit()

    response = client.get("/api/v1/audio/POI_DOES_NOT_EXIST?token=token_404_active")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "AUDIO_NOT_FOUND"
