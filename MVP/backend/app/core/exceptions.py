"""Standardized API error envelope and application exception handlers.

dev_rules Section 6.1: every 4xx/5xx response must render
`{"success": false, "error": {"code", "message", "details"}}`.
"""

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

HTTP_ERROR_CODE = "HTTP_ERROR"
REQUEST_VALIDATION_ERROR_CODE = "REQUEST_VALIDATION_ERROR"
REQUEST_VALIDATION_ERROR_MESSAGE = "Request payload validation failed."
REQUEST_VALIDATION_ERROR_STATUS = 422


class ApiError(HTTPException):
    """HTTP exception that always renders the standardized error envelope."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Any = None,
    ) -> None:
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message, "details": details},
        )


def build_error_envelope(
    code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    """Build the single error payload shape used by every failing endpoint."""
    return {
        "success": False,
        "error": {"code": code, "message": message, "details": details},
    }


def _render_http_exception(exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        content = build_error_envelope(
            code=detail["code"],
            message=detail.get("message", ""),
            details=detail.get("details"),
        )
        if (
            exc.status_code == 423
            and isinstance(detail.get("details"), dict)
            and "retry_after_seconds" in detail["details"]
        ):
            content["retry_after_seconds"] = detail["details"]["retry_after_seconds"]
            content["detail"] = detail.get("message", "Account locked")
    else:
        content = build_error_envelope(
            code=HTTP_ERROR_CODE, message=str(detail), details=None
        )
    return JSONResponse(status_code=exc.status_code, content=content)


def register_error_handlers(app: FastAPI) -> None:
    """Attach the standardized error envelope to every HTTP failure path."""

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _render_http_exception(exc)

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        content = build_error_envelope(
            code=REQUEST_VALIDATION_ERROR_CODE,
            message=REQUEST_VALIDATION_ERROR_MESSAGE,
            details=jsonable_encoder(exc.errors()),
        )
        return JSONResponse(
            status_code=REQUEST_VALIDATION_ERROR_STATUS, content=content
        )
