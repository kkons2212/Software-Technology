from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.controllers import session_controller
from app.core.dependencies import get_session_service
from app.core.exceptions import ApiError
from app.core.session_restore_rate_limit import SessionRestoreRateLimiter
from app.main import app
from app.models.session import generate_session_code
from app.schemas.session_schema import SessionRestoreRequest


def test_generated_session_codes_have_128_bits_of_entropy():
    code = generate_session_code()

    assert code.startswith("CCT-")
    assert len(code) == 36
    assert all(character in "0123456789ABCDEF" for character in code[4:])


def test_restore_request_normalizes_full_entropy_code_without_prefix():
    request = SessionRestoreRequest(session_code="A" * 32)

    assert request.session_code == f"CCT-{'A' * 32}"


def test_restore_endpoint_returns_429_after_repeated_code_attempts(monkeypatch):
    session_service = MagicMock()
    session_service.restore_session.side_effect = ApiError(
        status_code=404,
        code="SESSION_NOT_FOUND",
        message="Session code is invalid or has expired.",
    )
    monkeypatch.setitem(
        app.dependency_overrides,
        get_session_service,
        lambda: session_service,
    )
    monkeypatch.setattr(
        session_controller, "session_restore_rate_limiter", SessionRestoreRateLimiter()
    )

    with TestClient(app) as client:
        responses = [
            client.post(
                "/api/v1/sessions/restore",
                json={"session_code": "CCT-RATE-LIMIT"},
            )
            for _ in range(5)
        ]
        limited_response = client.post(
            "/api/v1/sessions/restore",
            json={"session_code": "CCT-RATE-LIMIT"},
        )

    assert all(response.status_code == 404 for response in responses)
    assert limited_response.status_code == 429
    assert limited_response.headers["Retry-After"]
    assert limited_response.json()["error"]["code"] == "SESSION_RESTORE_RATE_LIMITED"
