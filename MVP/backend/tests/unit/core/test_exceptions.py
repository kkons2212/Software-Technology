"""Paired unit tests for `app.core.exceptions` (dev_rules Section 6.1 envelope)."""

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.exceptions import (
    HTTP_ERROR_CODE,
    REQUEST_VALIDATION_ERROR_CODE,
    REQUEST_VALIDATION_ERROR_STATUS,
    ApiError,
    build_error_envelope,
    register_error_handlers,
)

ERROR_CODE = "INVALID_CREDENTIALS"
ERROR_MESSAGE = "Invalid username or password"
ERROR_DETAILS = {"field": "password"}
UNAUTHORIZED_STATUS = 401
NOT_FOUND_STATUS = 404


def _build_probe_app() -> FastAPI:
    """Minimal app wiring the US 02.1 error envelope onto three failure paths."""
    probe_app = FastAPI()
    register_error_handlers(probe_app)

    @probe_app.get("/api-error")
    def raise_api_error() -> None:
        raise ApiError(
            status_code=UNAUTHORIZED_STATUS,
            code=ERROR_CODE,
            message=ERROR_MESSAGE,
            details=ERROR_DETAILS,
        )

    @probe_app.get("/plain-http-error")
    def raise_plain_http_error() -> None:
        raise HTTPException(status_code=NOT_FOUND_STATUS, detail="POI not found")

    @probe_app.get("/validated")
    def validated_endpoint(radius: int) -> dict[str, int]:
        return {"radius": radius}

    return probe_app


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_build_standardized_error_envelope_when_details_provided():
    envelope = build_error_envelope(ERROR_CODE, ERROR_MESSAGE, ERROR_DETAILS)

    assert envelope == {
        "success": False,
        "error": {
            "code": ERROR_CODE,
            "message": ERROR_MESSAGE,
            "details": ERROR_DETAILS,
        },
    }


def test_should_render_standardized_envelope_when_api_error_raised():
    with TestClient(_build_probe_app()) as client:
        response = client.get("/api-error")

    assert response.status_code == UNAUTHORIZED_STATUS
    assert response.json() == {
        "success": False,
        "error": {
            "code": ERROR_CODE,
            "message": ERROR_MESSAGE,
            "details": ERROR_DETAILS,
        },
    }


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_default_details_to_none_when_omitted():
    envelope = build_error_envelope(ERROR_CODE, ERROR_MESSAGE)

    assert envelope["error"]["details"] is None


def test_should_store_code_and_message_inside_exception_detail():
    api_error = ApiError(
        status_code=UNAUTHORIZED_STATUS, code=ERROR_CODE, message=ERROR_MESSAGE
    )

    assert api_error.status_code == UNAUTHORIZED_STATUS
    assert api_error.detail == {
        "code": ERROR_CODE,
        "message": ERROR_MESSAGE,
        "details": None,
    }


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_wrap_plain_http_exception_into_error_envelope():
    with TestClient(_build_probe_app()) as client:
        response = client.get("/plain-http-error")

    assert response.status_code == NOT_FOUND_STATUS
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == HTTP_ERROR_CODE
    assert body["error"]["message"] == "POI not found"
    assert body["error"]["details"] is None


def test_should_render_envelope_when_request_validation_fails():
    with TestClient(_build_probe_app()) as client:
        response = client.get("/validated", params={"radius": "out-of-range"})

    assert response.status_code == REQUEST_VALIDATION_ERROR_STATUS
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == REQUEST_VALIDATION_ERROR_CODE
    assert isinstance(body["error"]["details"], list)
    assert body["error"]["details"]
