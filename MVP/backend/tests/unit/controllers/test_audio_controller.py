"""Unit tests for audio regeneration endpoints (US 04.2)."""

from app.core.dependencies import get_tts_service
from app.core.exceptions import ApiError
from app.main import app
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
