"""Unit test suite for application configuration singleton (REF-07.2)."""

import secrets

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings


def test_settings_default_values():
    """Verify application configuration initializes with expected defaults."""
    cfg = Settings()
    assert cfg.PROJECT_NAME == "Smart Multilingual Audio Guide - Cu Chi Tunnels"
    assert cfg.API_V1_STR == "/api/v1"
    assert cfg.BCRYPT_ROUNDS == 12
    assert cfg.DB_POOL_SIZE == 10
    assert cfg.PAYPAL_MODE == "sandbox"
    assert cfg.SERVICE_FEE_CURRENCY == "VND"
    assert cfg.ALLOW_GLOBAL_COORDINATES is False


def test_settings_defaults_to_production_environment(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    cfg = Settings(_env_file=None, JWT_SECRET_KEY=secrets.token_hex(32))

    assert cfg.ENVIRONMENT == "production"
    assert cfg.is_development is False


def test_settings_requires_jwt_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


@pytest.mark.parametrize(
    "secret",
    [
        "",
        "short-secret",
        "smart-museum-dev-placeholder-jwt-key",
        "g" * 64,
    ],
)
def test_settings_rejects_weak_or_malformed_jwt_secret(secret):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, JWT_SECRET_KEY=secret)


def test_settings_accepts_256_bit_hex_jwt_secret():
    secret = secrets.token_hex(32)

    cfg = Settings(_env_file=None, JWT_SECRET_KEY=secret)

    assert cfg.JWT_SECRET_KEY == secret


def test_translation_providers_list_parsing():
    """Verify translation_providers_list cleanly parses comma-separated providers and handles defaults."""
    # Empty providers gate
    cfg_empty = Settings(TRANSLATION_PROVIDERS_ORDER="")
    assert cfg_empty.translation_providers_list == ["render_api", "openrouter"]

    # Whitespace only
    cfg_spaces = Settings(TRANSLATION_PROVIDERS_ORDER="   ,  ")
    assert cfg_spaces.translation_providers_list == ["render_api", "openrouter"]

    # Valid comma-separated tokens
    cfg_valid = Settings(TRANSLATION_PROVIDERS_ORDER="render_api, openrouter")
    assert cfg_valid.translation_providers_list == ["render_api", "openrouter"]


def test_render_translation_settings():
    """Verify render translation API settings initialize with expected defaults."""
    cfg = Settings()
    assert (
        cfg.RENDER_TRANSLATION_API_URL == "https://translation-temporary.onrender.com"
    )
    assert cfg.RENDER_TRANSLATION_TIMEOUT == 70.0
    assert cfg.RENDER_COLD_START_RETRY_DELAY == 10.0
    assert cfg.RENDER_KEEP_ALIVE_ENABLED is False
    assert cfg.RENDER_KEEP_ALIVE_INTERVAL_SECONDS == 600
    assert cfg.LOG_LEVEL == "INFO"


def test_get_settings_singleton_caching():
    """Verify get_settings returns a cached singleton instance."""
    instance_1 = get_settings()
    instance_2 = get_settings()
    assert instance_1 is instance_2
