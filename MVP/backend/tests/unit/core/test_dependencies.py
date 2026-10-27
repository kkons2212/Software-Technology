"""Paired unit tests for `app.core.dependencies` (US 02.1 composition root)."""

import pytest
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.core.dependencies import (
    get_audit_repository,
    get_auth_service,
    get_current_admin_profile,
    get_user_repository,
)
from app.core.exceptions import ApiError
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import AdminProfileResponse
from app.services.auth_service import AuthService

SESSION_COOKIE_HEADER = b"admin_session=session-token-value"
ADMIN_USER_NAME = "admin"
ADMIN_EMAIL = "admin@cuchi.vn"


def _build_request(cookie_header: bytes | None = None) -> Request:
    """Build a bare ASGI request scope, optionally carrying a session cookie."""
    headers = [(b"cookie", cookie_header)] if cookie_header else []
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/v1/auth/me",
        "raw_path": b"/api/v1/auth/me",
        "query_string": b"",
        "headers": headers,
        "client": ("127.0.0.1", 51234),
        "server": ("testserver", 80),
    }
    return Request(scope)


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_bind_user_repository_to_request_scoped_session(db_session: Session):
    repository = get_user_repository(db_session)

    assert isinstance(repository, UserRepository)
    assert repository.db is db_session


def test_should_bind_audit_repository_to_request_scoped_session(db_session: Session):
    repository = get_audit_repository(db_session)

    assert isinstance(repository, AuditRepository)
    assert repository.db is db_session


def test_should_compose_auth_service_with_both_repositories(db_session: Session):
    user_repository = get_user_repository(db_session)
    audit_repository = get_audit_repository(db_session)

    auth_service = get_auth_service(user_repository, audit_repository)

    assert isinstance(auth_service, AuthService)
    assert auth_service.user_repository is user_repository
    assert auth_service.audit_repository is audit_repository


def test_should_resolve_admin_profile_when_session_cookie_is_present(mocker):
    expected_profile = AdminProfileResponse(
        user_name=ADMIN_USER_NAME, email=ADMIN_EMAIL, full_name="System Administrator"
    )
    fake_auth_service = mocker.MagicMock(spec=AuthService)
    fake_auth_service.resolve_authenticated_admin.return_value = expected_profile

    profile = get_current_admin_profile(
        request=_build_request(SESSION_COOKIE_HEADER),
        auth_service=fake_auth_service,
    )

    assert profile == expected_profile
    fake_auth_service.resolve_authenticated_admin.assert_called_once_with(
        "session-token-value"
    )


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_pass_none_when_session_cookie_is_absent(mocker):
    fake_auth_service = mocker.MagicMock(spec=AuthService)

    get_current_admin_profile(
        request=_build_request(),
        auth_service=fake_auth_service,
    )

    fake_auth_service.resolve_authenticated_admin.assert_called_once_with(None)


def test_should_ignore_unrelated_cookies_when_session_cookie_is_absent(mocker):
    fake_auth_service = mocker.MagicMock(spec=AuthService)

    get_current_admin_profile(
        request=_build_request(b"other_cookie=abc"),
        auth_service=fake_auth_service,
    )

    fake_auth_service.resolve_authenticated_admin.assert_called_once_with(None)


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_propagate_unauthenticated_error_from_service(mocker):
    fake_auth_service = mocker.MagicMock(spec=AuthService)
    fake_auth_service.resolve_authenticated_admin.side_effect = ApiError(
        status_code=401, code="UNAUTHENTICATED", message="expired"
    )

    with pytest.raises(ApiError) as raised_error:
        get_current_admin_profile(
            request=_build_request(b"admin_session=expired-token"),
            auth_service=fake_auth_service,
        )

    assert raised_error.value.status_code == 401
