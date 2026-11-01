"""Unit test suite for application configuration singleton (REF-07.2)."""

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
    assert cfg.ALLOW_GLOBAL_COORDINATES is True


def test_gemini_keys_list_parsing():
    """Verify gemini_keys_list cleanly parses comma-separated keys and handles empty states."""
    # Empty keys gate
    cfg_empty = Settings(GEMINI_API_KEYS="")
    assert cfg_empty.gemini_keys_list == []

    # Whitespace only
    cfg_spaces = Settings(GEMINI_API_KEYS="   ,  ")
    assert cfg_spaces.gemini_keys_list == []

    # Valid comma-separated tokens
    cfg_valid = Settings(GEMINI_API_KEYS="key_alpha, key_beta ,key_gamma")
    assert cfg_valid.gemini_keys_list == ["key_alpha", "key_beta", "key_gamma"]


def test_google_translate_keys_list_parsing():
    """Verify google_translate_keys_list cleanly parses tokens and handles empty states."""
    # Empty keys gate
    cfg_empty = Settings(GOOGLE_TRANSLATE_API_KEYS="")
    assert cfg_empty.google_translate_keys_list == []

    # Valid comma-separated tokens
    cfg_valid = Settings(GOOGLE_TRANSLATE_API_KEYS="token_1, token_2")
    assert cfg_valid.google_translate_keys_list == ["token_1", "token_2"]


def test_get_settings_singleton_caching():
    """Verify get_settings returns a cached singleton instance."""
    instance_1 = get_settings()
    instance_2 = get_settings()
    assert instance_1 is instance_2
