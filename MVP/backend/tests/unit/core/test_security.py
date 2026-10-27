"""Paired unit tests for `app.core.security` (US 02.1 - AC-02.1.2 / AC-02.1.3)."""

from datetime import datetime, timedelta, timezone
from unittest import mock

import pytest

from app.core.config import DEFAULT_BCRYPT_ROUNDS, Settings
from app.core.security import (
    JWT_EXPIRES_AT_CLAIM,
    JWT_SUBJECT_CLAIM,
    create_admin_access_token,
    decode_admin_access_token,
    get_access_token_max_age_seconds,
    hash_password,
    verify_password,
)

PLAIN_PASSWORD = "Admin@12345"
ADMIN_USER_NAME = "admin"
EXPECTED_MAX_AGE_SECONDS = 3600
SECONDS_PER_MINUTE = 60


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_return_one_way_bcrypt_hash_when_password_hashed():
    password_hash = hash_password(PLAIN_PASSWORD)

    assert password_hash != PLAIN_PASSWORD
    assert password_hash.startswith("$2b$")
    assert verify_password(PLAIN_PASSWORD, password_hash) is True


def test_should_sign_and_decode_token_when_administrator_authenticates():
    access_token = create_admin_access_token(ADMIN_USER_NAME)

    claims = decode_admin_access_token(access_token)

    assert claims is not None
    assert claims[JWT_SUBJECT_CLAIM] == ADMIN_USER_NAME
    assert JWT_EXPIRES_AT_CLAIM in claims


def test_should_return_3600_seconds_cookie_lifetime_for_60_minute_session():
    assert get_access_token_max_age_seconds() == EXPECTED_MAX_AGE_SECONDS


def test_should_embed_60_minute_expiration_when_token_created():
    access_token = create_admin_access_token(ADMIN_USER_NAME)

    claims = decode_admin_access_token(access_token)
    expires_at = datetime.fromtimestamp(claims[JWT_EXPIRES_AT_CLAIM], tz=timezone.utc)
    remaining = expires_at - datetime.now(timezone.utc)

    assert timedelta(minutes=59) <= remaining <= timedelta(minutes=60, seconds=5)


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_hash_password_at_exactly_72_bytes_without_raising():
    # 72 bytes is the hard Bcrypt input limit; longer inputs are truncated.
    boundary_password = "A" * 72

    password_hash = hash_password(boundary_password)

    assert verify_password(boundary_password, password_hash) is True


def test_should_match_password_sharing_the_truncated_bcrypt_prefix():
    boundary_password = "A" * 72
    password_hash = hash_password(boundary_password)

    # Anything beyond byte 72 is discarded by Bcrypt, so the prefix matches.
    assert verify_password(f"{boundary_password}EXTRA", password_hash) is True


def test_should_use_configuration_provided_cost_factor():
    # The autouse fixture injects a low-cost Settings singleton for speed; the
    # real production default must still be the mandated cost factor >= 12.
    assert DEFAULT_BCRYPT_ROUNDS >= 12
    assert Settings().BCRYPT_ROUNDS == DEFAULT_BCRYPT_ROUNDS


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_return_false_when_password_does_not_match():
    password_hash = hash_password(PLAIN_PASSWORD)

    assert verify_password("Wrong@12345", password_hash) is False


def test_should_return_false_when_stored_hash_is_malformed():
    # A corrupted DB value must degrade to False instead of raising a 500.
    assert verify_password(PLAIN_PASSWORD, "not-a-bcrypt-hash") is False


def test_should_return_none_when_token_signature_is_tampered():
    access_token = create_admin_access_token(ADMIN_USER_NAME)
    tampered_token = f"{access_token}tampered"

    assert decode_admin_access_token(tampered_token) is None


def test_should_return_none_when_token_is_garbage():
    assert decode_admin_access_token("this.is.not-a-jwt") is None
    assert decode_admin_access_token("") is None


def test_should_return_none_when_token_has_expired(mocker):
    # Force an already-expired token by driving the configured lifespan negative.
    mocker.patch(
        "app.core.security.get_settings",
        return_value=Settings(ACCESS_TOKEN_EXPIRE_MINUTES=-1),
    )
    expired_token = create_admin_access_token(ADMIN_USER_NAME)

    assert decode_admin_access_token(expired_token) is None


def test_should_return_none_when_token_signed_with_another_secret():
    # Sign with a foreign secret, then verify again once the genuine settings
    # are restored: the signature check must fail and degrade to `None`.
    with mock.patch(
        "app.core.security.get_settings",
        return_value=Settings(JWT_SECRET_KEY="another-secret-key"),
    ):
        foreign_token = create_admin_access_token(ADMIN_USER_NAME)

    assert decode_admin_access_token(foreign_token) is None


@pytest.mark.parametrize("malformed_hash", ["", "$2b$12$", "plaintext"])
def test_should_return_false_for_every_malformed_hash_variant(malformed_hash):
    assert verify_password(PLAIN_PASSWORD, malformed_hash) is False
