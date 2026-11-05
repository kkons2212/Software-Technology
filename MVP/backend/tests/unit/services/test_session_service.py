"""Unit tests for SessionService under SISE architecture (Task REF-06.2 & REF-06.5)."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import ApiError
from app.models.session import VisitorSession
from app.repositories.session_repository import SessionRepository
from app.services.session_service import SessionService


@pytest.fixture
def mock_session_repo():
    return MagicMock(spec=SessionRepository)


@pytest.fixture
def session_service(mock_session_repo):
    return SessionService(session_repository=mock_session_repo)


def test_restore_session_not_found_raises_404(session_service, mock_session_repo):
    # Arrange
    mock_session_repo.get_by_code.return_value = None

    # Act & Assert
    with pytest.raises(ApiError) as exc_info:
        session_service.restore_session("CCT-NOTFOUND")

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "SESSION_NOT_FOUND"
    mock_session_repo.get_by_code.assert_called_once_with("CCT-NOTFOUND")


def test_restore_session_expired_status_raises_404(session_service, mock_session_repo):
    # Arrange
    session = VisitorSession(
        SessionID="SES_001",
        SessionCode="CCT-EXPIRED1",
        SessionToken="token_123",
        Status="EXPIRED",
        Activate_at=datetime.utcnow() - timedelta(hours=25),
        Expire_at=datetime.utcnow() + timedelta(hours=1),
        PreferredLanguage="vi",
    )
    mock_session_repo.get_by_code.return_value = session

    # Act & Assert
    with pytest.raises(ApiError) as exc_info:
        session_service.restore_session("CCT-EXPIRED1")

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "SESSION_NOT_FOUND"


def test_restore_session_expired_timestamp_raises_404(
    session_service, mock_session_repo
):
    # Arrange
    session = VisitorSession(
        SessionID="SES_002",
        SessionCode="CCT-EXPIRED2",
        SessionToken="token_456",
        Status="ACTIVE",
        Activate_at=datetime.utcnow() - timedelta(hours=30),
        Expire_at=datetime.utcnow() - timedelta(hours=1),
        PreferredLanguage="vi",
    )
    mock_session_repo.get_by_code.return_value = session

    # Act & Assert
    with pytest.raises(ApiError) as exc_info:
        session_service.restore_session("CCT-EXPIRED2")

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "SESSION_NOT_FOUND"


def test_restore_session_success_active(session_service, mock_session_repo):
    # Arrange
    now = datetime.utcnow()
    expire_at = now + timedelta(hours=12)
    session = VisitorSession(
        SessionID="SES_VALID",
        SessionCode="CCT-VALID1",
        SessionToken="valid_token_abc",
        Status="ACTIVE",
        Activate_at=now - timedelta(hours=12),
        Expire_at=expire_at,
        PreferredLanguage="en",
    )
    mock_session_repo.get_by_code.return_value = session
    mock_session_repo.ensure_session_token.return_value = "valid_token_abc"

    # Act
    res = session_service.restore_session("  cct-valid1  ")

    # Assert
    assert res.success is True
    assert res.data.session_id == "SES_VALID"
    assert res.data.session_code == "CCT-VALID1"
    assert res.data.session_token == "valid_token_abc"
    assert res.data.status == "ACTIVE"
    assert res.data.preferred_language == "en"
    assert res.data.remaining_seconds > 0
    mock_session_repo.get_by_code.assert_called_once_with("CCT-VALID1")
    mock_session_repo.ensure_session_token.assert_called_once_with(session)


def test_restore_session_prefix_normalization(session_service, mock_session_repo):
    # Arrange: 6-char hex code without CCT- prefix
    now = datetime.utcnow()
    session = VisitorSession(
        SessionID="SES_NORM",
        SessionCode="CCT-123456",
        SessionToken="token_xyz",
        Status="ACTIVE",
        Activate_at=now,
        Expire_at=now + timedelta(hours=24),
        PreferredLanguage="vi",
    )
    mock_session_repo.get_by_code.return_value = session
    mock_session_repo.ensure_session_token.return_value = "token_xyz"

    # Act: pass 6-char code without CCT-
    res = session_service.restore_session("123456")

    # Assert
    assert res.success is True
    assert res.data.session_code == "CCT-123456"
    mock_session_repo.get_by_code.assert_called_once_with("CCT-123456")


def test_restore_session_normalizes_new_code_without_prefix(
    session_service, mock_session_repo
):
    session_code = f"CCT-{'A' * 32}"
    now = datetime.utcnow()
    session = VisitorSession(
        SessionID="SES_LONG_CODE",
        SessionCode=session_code,
        SessionToken="token_long_code",
        Status="ACTIVE",
        Activate_at=now,
        Expire_at=now + timedelta(hours=24),
        PreferredLanguage="vi",
    )
    mock_session_repo.get_by_code.return_value = session
    mock_session_repo.ensure_session_token.return_value = session.SessionToken

    response = session_service.restore_session("A" * 32)

    assert response.data.session_code == session_code
    mock_session_repo.get_by_code.assert_called_once_with(session_code)


def test_validate_session_active_checks(session_service, mock_session_repo):
    # 1. Empty token
    assert session_service.validate_session_active("") is False
    assert session_service.validate_session_active(None) is False
    assert mock_session_repo.is_session_active.call_count == 0

    # 2. Active token
    mock_session_repo.is_session_active.return_value = True
    assert session_service.validate_session_active("valid_token") is True
    mock_session_repo.is_session_active.assert_called_once_with("valid_token")

    # 3. Inactive token
    mock_session_repo.is_session_active.return_value = False
    assert session_service.validate_session_active("inactive_token") is False
