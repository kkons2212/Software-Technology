"""Paired unit tests for `app.schemas.auth_schema` (US 02.1 & US 02.3 DTOs)."""

import pytest
from pydantic import ValidationError

from app.models.user import User
from app.schemas.auth_schema import (
    ADMIN_LOGOUT_MESSAGE,
    ADMIN_PASSWORD_MAX_LENGTH,
    ADMIN_USERNAME_MAX_LENGTH,
    AdminLoginRequest,
    AdminLogoutDataResponse,
    AdminLogoutResponse,
    AdminProfileResponse,
    AdminSessionDataResponse,
    AdminSessionResponse,
    AdminSessionTokenDTO,
)

VALID_USER_NAME = "admin"
VALID_EMAIL = "admin@cuchi.vn"
VALID_PASSWORD = "Admin@12345"
PASSWORD_HASH = "$2b$12$supersecrethash"


def _build_admin_model() -> User:
    return User(
        user_name=VALID_USER_NAME,
        email=VALID_EMAIL,
        password_hash=PASSWORD_HASH,
        full_name="System Administrator",
        is_active=True,
        falsed_attempts=0,
    )


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_accept_credentials_when_payload_valid():
    login_request = AdminLoginRequest(username=VALID_USER_NAME, password=VALID_PASSWORD)

    assert login_request.username == VALID_USER_NAME
    assert login_request.password == VALID_PASSWORD


def test_should_strip_surrounding_whitespace_from_username():
    login_request = AdminLoginRequest(
        username=f"  {VALID_USER_NAME}  ", password=f"  {VALID_PASSWORD}  "
    )

    assert login_request.username == VALID_USER_NAME
    # Only the identifier is trimmed: passwords keep their exact bytes.
    assert login_request.password == f"  {VALID_PASSWORD}  "


def test_should_build_profile_from_orm_entity_without_exposing_password_hash():
    profile = AdminProfileResponse.model_validate(_build_admin_model())

    assert profile.user_name == VALID_USER_NAME
    assert profile.email == VALID_EMAIL
    assert profile.full_name == "System Administrator"
    assert "password_hash" not in profile.model_dump()


def test_should_default_session_envelope_success_flag_to_true():
    profile = AdminProfileResponse(user_name=VALID_USER_NAME, email=VALID_EMAIL)

    session_response = AdminSessionResponse(
        data=AdminSessionDataResponse(admin=profile)
    )

    assert session_response.success is True
    assert session_response.data.admin.user_name == VALID_USER_NAME
    assert session_response.model_dump()["success"] is True


def test_should_carry_access_token_and_profile_in_token_dto():
    profile = AdminProfileResponse(user_name=VALID_USER_NAME, email=VALID_EMAIL)

    token_dto = AdminSessionTokenDTO(access_token="signed.jwt.token", admin=profile)

    assert token_dto.access_token == "signed.jwt.token"
    assert token_dto.admin.email == VALID_EMAIL


def test_should_build_logout_envelope_with_default_message():
    logout_response = AdminLogoutResponse(data=AdminLogoutDataResponse())

    assert logout_response.success is True
    assert logout_response.data.message == ADMIN_LOGOUT_MESSAGE
    assert logout_response.model_dump() == {
        "success": True,
        "data": {"message": ADMIN_LOGOUT_MESSAGE},
    }


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_allow_overriding_the_logout_message():
    logout_response = AdminLogoutResponse(
        data=AdminLogoutDataResponse(message="Session closed")
    )

    assert logout_response.data.message == "Session closed"


def test_should_accept_username_and_password_at_maximum_length():
    longest_username = "u" * ADMIN_USERNAME_MAX_LENGTH

    login_request = AdminLoginRequest(
        username=longest_username, password="p" * ADMIN_PASSWORD_MAX_LENGTH
    )

    assert len(login_request.username) == ADMIN_USERNAME_MAX_LENGTH
    assert len(login_request.password) == ADMIN_PASSWORD_MAX_LENGTH


def test_should_allow_nullable_full_name_in_profile():
    admin_without_full_name = _build_admin_model()
    admin_without_full_name.full_name = None

    profile = AdminProfileResponse.model_validate(admin_without_full_name)

    assert profile.full_name is None


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("empty_payload", [{"username": "", "password": "x"}])
def test_should_reject_empty_username(empty_payload):
    with pytest.raises(ValidationError):
        AdminLoginRequest(**empty_payload)


def test_should_reject_whitespace_only_username():
    # `str_strip_whitespace` runs before `min_length`, so " " collapses to "".
    with pytest.raises(ValidationError):
        AdminLoginRequest(username="   ", password=VALID_PASSWORD)


def test_should_reject_username_exceeding_maximum_length():
    with pytest.raises(ValidationError):
        AdminLoginRequest(
            username="u" * (ADMIN_USERNAME_MAX_LENGTH + 1), password=VALID_PASSWORD
        )


def test_should_reject_password_exceeding_maximum_length():
    with pytest.raises(ValidationError):
        AdminLoginRequest(
            username=VALID_USER_NAME, password="p" * (ADMIN_PASSWORD_MAX_LENGTH + 1)
        )


@pytest.mark.parametrize("missing_field", ["username", "password"])
def test_should_reject_payload_missing_required_field(missing_field):
    complete_payload = {"username": VALID_USER_NAME, "password": VALID_PASSWORD}
    complete_payload.pop(missing_field)

    with pytest.raises(ValidationError):
        AdminLoginRequest(**complete_payload)
