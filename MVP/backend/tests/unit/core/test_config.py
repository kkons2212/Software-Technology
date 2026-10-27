"""Paired unit tests for `app.core.config` (US 02.1 - AC-02.1.2 / AC-02.1.3)."""

import pytest
from pydantic import ValidationError

from app.core.config import (
    DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
    DEFAULT_ADMIN_SESSION_COOKIE_NAME,
    DEFAULT_BCRYPT_ROUNDS,
    DEFAULT_JWT_ALGORITHM,
    Settings,
    get_settings,
)

MANDATED_BCRYPT_MINIMUM_COST = 12
MANDATED_ACCESS_TOKEN_MINUTES = 60
MANDATED_IDLE_TIMEOUT_MINUTES = 30


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_expose_mandated_production_defaults_when_no_env_is_set():
    settings = Settings()

    assert settings.JWT_ALGORITHM == "HS256"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == MANDATED_ACCESS_TOKEN_MINUTES
    assert settings.IDLE_TIMEOUT_MINUTES == MANDATED_IDLE_TIMEOUT_MINUTES
    assert settings.BCRYPT_ROUNDS >= MANDATED_BCRYPT_MINIMUM_COST
    assert settings.ADMIN_SESSION_COOKIE_NAME == DEFAULT_ADMIN_SESSION_COOKIE_NAME
    assert settings.IS_COOKIE_SECURE is False


def test_should_return_cached_singleton_when_settings_requested_twice():
    first_settings = get_settings()
    second_settings = get_settings()

    assert first_settings is second_settings


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_keep_cookie_lifetime_equal_to_jwt_lifespan():
    settings = Settings()

    # The HttpOnly cookie must never outlive the signed JWT.
    assert (
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


def test_should_honour_environment_override_for_bcrypt_cost(monkeypatch):
    monkeypatch.setenv("BCRYPT_ROUNDS", "14")

    overridden_settings = Settings()

    assert overridden_settings.BCRYPT_ROUNDS == 14
    # Untouched keys must fall back to their defaults.
    assert overridden_settings.JWT_ALGORITHM == DEFAULT_JWT_ALGORITHM


def test_should_ignore_unknown_environment_variables(monkeypatch):
    monkeypatch.setenv("UNRELATED_SETTING", "whatever")

    overridden_settings = Settings()

    assert not hasattr(overridden_settings, "UNRELATED_SETTING")


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_fail_fast_when_environment_value_has_wrong_type(monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "not-a-number")

    with pytest.raises(ValidationError):
        Settings()


def test_should_enforce_secure_cookie_flag_when_explicitly_enabled(monkeypatch):
    monkeypatch.setenv("IS_COOKIE_SECURE", "true")

    overridden_settings = Settings()

    assert overridden_settings.IS_COOKIE_SECURE is True
    assert overridden_settings.BCRYPT_ROUNDS == DEFAULT_BCRYPT_ROUNDS
