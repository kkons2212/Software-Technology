"""Paired unit tests for `app.services.auth_service` (US 02.1 - TSK-02.1.3 & US 02.2 - TSK-02.2.1).

DoD of TSK-02.1.3 requires 100% coverage of the three decisive branches:
valid login, invalid password and nonexistent user.
DoD of TSK-02.2.1 & TSK-02.2.4 tests failed attempt tracking, 15-minute account
lockout upon 5 consecutive failures, rejecting logins when locked, auto-unlock
after expiration, and counter reset on success.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import ApiError
from app.core.security import (
    decode_admin_access_token,
    hash_password,
)
from app.models.audit import (
    AUDIT_STATUS_FAILED,
    AUDIT_STATUS_SUCCESS,
    Audit,
)
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import AdminLoginRequest
from app.services.auth_service import (
    ACCOUNT_LOCKED_ERROR_CODE,
    ACCOUNT_LOCKED_ERROR_MESSAGE,
    INVALID_CREDENTIALS_ERROR_CODE,
    INVALID_CREDENTIALS_ERROR_MESSAGE,
    LOGIN_ACCOUNT_LOCKED_DETAILS,
    LOGIN_FAILED_DETAILS,
    LOGIN_INACTIVE_ACCOUNT_DETAILS,
    LOGIN_SUCCESS_DETAILS,
    UNAUTHENTICATED_ERROR_CODE,
    AuthService,
)

VALID_USER_NAME = "admin"
VALID_EMAIL = "admin@cuchi.vn"
VALID_PASSWORD = "Admin@12345"
CLIENT_IP = "203.0.113.7"
UNKNOWN_USER_NAME = "ghost-admin"


@pytest.fixture()
def user_repository(db_session: Session) -> UserRepository:
    return UserRepository(db_session)


@pytest.fixture()
def audit_repository(db_session: Session) -> AuditRepository:
    return AuditRepository(db_session)


@pytest.fixture()
def auth_service(
    user_repository: UserRepository,
    audit_repository: AuditRepository,
) -> AuthService:
    return AuthService(
        user_repository=user_repository,
        audit_repository=audit_repository,
    )


@pytest.fixture()
def active_admin(user_repository: UserRepository) -> User:
    """Seed one active administrator with a real Bcrypt hash of `Admin@12345`."""
    return user_repository.create_admin(
        User(
            user_name=VALID_USER_NAME,
            email=VALID_EMAIL,
            password_hash=hash_password(VALID_PASSWORD),
            full_name="System Administrator",
            is_active=True,
            falsed_attempts=0,
        )
    )


def _count_audit_rows(db_session: Session, status: str) -> int:
    return db_session.query(Audit).filter(Audit.status == status).count()


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_issue_valid_jwt_and_profile_when_credentials_valid(
    auth_service, active_admin, db_session
):
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    claims = decode_admin_access_token(session_token.access_token)
    assert claims is not None
    assert claims["sub"] == VALID_USER_NAME
    assert session_token.admin.user_name == VALID_USER_NAME
    assert session_token.admin.email == VALID_EMAIL
    # The credential material must never travel back to the caller.
    assert "password_hash" not in session_token.admin.model_dump()
    # The `exp` claim stays inside the mandated 60-minute window.
    expires_at = datetime.fromtimestamp(claims["exp"], tz=timezone.utc)
    assert (
        timedelta(minutes=59)
        <= expires_at - datetime.now(timezone.utc)
        <= timedelta(minutes=61)
    )


def test_should_accept_email_as_login_identifier(auth_service, active_admin):
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_EMAIL, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    assert session_token.admin.user_name == VALID_USER_NAME


def test_should_record_success_audit_entry_with_client_ip(
    auth_service, active_admin, db_session
):
    auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    success_rows = (
        db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_SUCCESS).all()
    )
    assert len(success_rows) == 1
    assert success_rows[0].user_name == VALID_USER_NAME
    assert success_rows[0].ip_address == CLIENT_IP
    assert success_rows[0].details == LOGIN_SUCCESS_DETAILS


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_still_authenticate_when_client_ip_is_unavailable(
    auth_service, active_admin, db_session
):
    # IPv4/IPv6-less proxies report `None`; authentication must not depend on it.
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=None,
    )

    assert session_token.access_token
    success_row = (
        db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_SUCCESS).one()
    )
    assert success_row.ip_address is None


def test_should_accept_password_at_maximum_allowed_length(
    auth_service, user_repository
):
    longest_password = "A" * 128
    user_repository.create_admin(
        User(
            user_name="long-password-admin",
            email="long-password-admin@cuchi.vn",
            password_hash=hash_password(longest_password),
            is_active=True,
            falsed_attempts=0,
        )
    )

    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username="long-password-admin", password=longest_password),
        client_ip=CLIENT_IP,
    )

    assert session_token.admin.user_name == "long-password-admin"


def test_should_trim_whitespace_from_submitted_identifier(auth_service, active_admin):
    # `AdminLoginRequest` strips whitespace, so a padded username still works.
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=f"  {VALID_USER_NAME}  ", password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    assert session_token.admin.user_name == VALID_USER_NAME


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_raise_generic_401_when_user_does_not_exist(auth_service, db_session):
    with pytest.raises(ApiError) as raised_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=UNKNOWN_USER_NAME, password=VALID_PASSWORD),
            client_ip=CLIENT_IP,
        )

    assert raised_error.value.status_code == 401
    assert raised_error.value.detail["code"] == INVALID_CREDENTIALS_ERROR_CODE
    assert raised_error.value.detail["message"] == INVALID_CREDENTIALS_ERROR_MESSAGE
    # An unknown identifier cannot be audited (UserName is a NOT NULL FK) ...
    assert _count_audit_rows(db_session, AUDIT_STATUS_FAILED) == 0


def test_should_raise_generic_401_and_audit_when_password_is_wrong(
    auth_service, active_admin, db_session
):
    with pytest.raises(ApiError) as raised_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=VALID_USER_NAME, password="Wrong@12345"),
            client_ip=CLIENT_IP,
        )

    assert raised_error.value.status_code == 401
    # ... while a known-but-wrong password is always recorded as FAILED.
    failed_rows = (
        db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_FAILED).all()
    )
    assert len(failed_rows) == 1
    assert failed_rows[0].user_name == VALID_USER_NAME
    assert failed_rows[0].ip_address == CLIENT_IP
    assert failed_rows[0].details == LOGIN_FAILED_DETAILS


def test_should_raise_generic_401_when_account_is_inactive(
    auth_service, user_repository, db_session
):
    user_repository.create_admin(
        User(
            user_name="disabled-admin",
            email="disabled-admin@cuchi.vn",
            password_hash=hash_password(VALID_PASSWORD),
            is_active=False,
            falsed_attempts=0,
        )
    )

    with pytest.raises(ApiError) as raised_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username="disabled-admin", password=VALID_PASSWORD),
            client_ip=CLIENT_IP,
        )

    assert raised_error.value.status_code == 401
    # The correct password is rejected for a disabled account and audited.
    failed_row = (
        db_session.query(Audit).filter(Audit.status == AUDIT_STATUS_FAILED).one()
    )
    assert failed_row.details == LOGIN_INACTIVE_ACCOUNT_DETAILS


def test_should_raise_401_when_password_hash_is_malformed(
    auth_service, user_repository
):
    user_repository.create_admin(
        User(
            user_name="broken-hash-admin",
            email="broken-hash-admin@cuchi.vn",
            password_hash="not-a-bcrypt-hash",
            is_active=True,
            falsed_attempts=0,
        )
    )

    with pytest.raises(ApiError) as raised_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username="broken-hash-admin", password=VALID_PASSWORD),
            client_ip=CLIENT_IP,
        )

    assert raised_error.value.status_code == 401


def test_should_not_leak_user_enumeration_between_missing_and_wrong_password(
    auth_service, active_admin
):
    with pytest.raises(ApiError) as missing_user_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=UNKNOWN_USER_NAME, password=VALID_PASSWORD),
            client_ip=CLIENT_IP,
        )
    with pytest.raises(ApiError) as wrong_password_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=VALID_USER_NAME, password="Wrong@12345"),
            client_ip=CLIENT_IP,
        )

    assert (
        missing_user_error.value.status_code == wrong_password_error.value.status_code
    )
    assert missing_user_error.value.detail == wrong_password_error.value.detail


# ---------------------------------------------------------------------------
# US 02.2: BRUTE-FORCE PROTECTION & ACCOUNT LOCKOUT (TSK-02.2.1 & TSK-02.2.4)
# ---------------------------------------------------------------------------
def test_should_increment_failed_attempts_on_invalid_password(
    auth_service, active_admin, db_session
):
    with pytest.raises(ApiError) as raised_error:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=VALID_USER_NAME, password="WrongPassword1"),
            client_ip=CLIENT_IP,
        )

    assert raised_error.value.status_code == 401
    db_session.refresh(active_admin)
    assert active_admin.falsed_attempts == 1
    assert active_admin.locked_until is None


def test_should_lock_account_for_15_minutes_on_fifth_consecutive_failed_attempt(
    auth_service, active_admin, db_session
):
    for i in range(4):
        with pytest.raises(ApiError) as err:
            auth_service.authenticate_admin(
                AdminLoginRequest(
                    username=VALID_USER_NAME, password=f"WrongPassword{i}"
                ),
                client_ip=CLIENT_IP,
            )
        assert err.value.status_code == 401

    db_session.refresh(active_admin)
    assert active_admin.falsed_attempts == 4
    assert active_admin.locked_until is None

    # 5th failed attempt triggers 15-minute lockout
    with pytest.raises(ApiError) as err:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=VALID_USER_NAME, password="WrongPassword5"),
            client_ip=CLIENT_IP,
        )

    assert err.value.status_code == 423
    assert err.value.detail["code"] == ACCOUNT_LOCKED_ERROR_CODE
    assert err.value.detail["message"] == ACCOUNT_LOCKED_ERROR_MESSAGE
    assert err.value.detail["details"]["retry_after_seconds"] == 15 * 60

    db_session.refresh(active_admin)
    assert active_admin.falsed_attempts == 5
    assert active_admin.locked_until is not None
    assert active_admin.locked_until > datetime.utcnow()

    # Verify security audit trail recorded lockout
    lockout_audits = (
        db_session.query(Audit)
        .filter(Audit.details == LOGIN_ACCOUNT_LOCKED_DETAILS)
        .all()
    )
    assert len(lockout_audits) == 1
    assert lockout_audits[0].user_name == VALID_USER_NAME


def test_should_reject_login_when_account_is_currently_locked(
    auth_service, active_admin, db_session
):
    active_admin.falsed_attempts = 5
    active_admin.locked_until = datetime.utcnow() + timedelta(minutes=10)
    db_session.commit()

    with pytest.raises(ApiError) as err:
        auth_service.authenticate_admin(
            AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
            client_ip=CLIENT_IP,
        )

    assert err.value.status_code == 423
    assert err.value.detail["code"] == ACCOUNT_LOCKED_ERROR_CODE
    # Remaining seconds should be approximately 600s
    assert 580 <= err.value.detail["details"]["retry_after_seconds"] <= 600


def test_should_automatically_unlock_when_lockout_period_has_expired(
    auth_service, active_admin, db_session
):
    # Lockout time has expired in the past
    active_admin.falsed_attempts = 5
    active_admin.locked_until = datetime.utcnow() - timedelta(minutes=1)
    db_session.commit()

    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    assert session_token.access_token
    db_session.refresh(active_admin)
    assert active_admin.falsed_attempts == 0
    assert active_admin.locked_until is None


def test_should_reset_failed_attempts_counter_on_successful_login(
    auth_service, active_admin, db_session
):
    # User failed 3 times
    active_admin.falsed_attempts = 3
    db_session.commit()

    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    assert session_token.access_token
    db_session.refresh(active_admin)
    assert active_admin.falsed_attempts == 0
    assert active_admin.locked_until is None


# ---------------------------------------------------------------------------
# SESSION RESOLUTION (`GET /api/v1/auth/me`)
# ---------------------------------------------------------------------------
def test_should_resolve_profile_when_session_cookie_is_valid(
    auth_service, active_admin
):
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )

    resolved_profile = auth_service.resolve_authenticated_admin(
        session_token.access_token
    )

    assert resolved_profile.user_name == VALID_USER_NAME
    assert resolved_profile.email == VALID_EMAIL


def test_should_raise_unauthenticated_when_cookie_is_missing(auth_service):
    with pytest.raises(ApiError) as raised_error:
        auth_service.resolve_authenticated_admin(None)

    assert raised_error.value.status_code == 401
    assert raised_error.value.detail["code"] == UNAUTHENTICATED_ERROR_CODE


def test_should_raise_unauthenticated_when_cookie_is_tampered(
    auth_service, active_admin
):
    with pytest.raises(ApiError) as raised_error:
        auth_service.resolve_authenticated_admin("tampered.jwt.value")

    assert raised_error.value.status_code == 401
    assert raised_error.value.detail["code"] == UNAUTHENTICATED_ERROR_CODE


def test_should_raise_unauthenticated_when_token_subject_no_longer_exists(
    auth_service, active_admin, mocker
):
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )
    # Simulate a deleted/renamed administrator while the cookie is still alive.
    mocker.patch.object(
        auth_service.user_repository,
        "find_by_username",
        return_value=None,
    )

    with pytest.raises(ApiError) as raised_error:
        auth_service.resolve_authenticated_admin(session_token.access_token)

    assert raised_error.value.detail["code"] == UNAUTHENTICATED_ERROR_CODE


def test_should_raise_unauthenticated_when_account_disabled_after_login(
    auth_service, active_admin, db_session
):
    session_token = auth_service.authenticate_admin(
        AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD),
        client_ip=CLIENT_IP,
    )
    active_admin.is_active = False
    db_session.commit()

    with pytest.raises(ApiError) as raised_error:
        auth_service.resolve_authenticated_admin(session_token.access_token)

    assert raised_error.value.detail["code"] == UNAUTHENTICATED_ERROR_CODE
