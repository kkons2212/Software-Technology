"""Application configuration resolved from environment variables (Pydantic Settings)."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_FILE_PATH = os.path.join(BACKEND_DIR, ".env")
DEFAULT_STATIC_DIR = os.path.join(BACKEND_DIR, "static")
DEFAULT_IMAGE_UPLOAD_DIR = os.path.join(DEFAULT_STATIC_DIR, "images")


class Settings(BaseSettings):
    """Runtime configuration (environment variables override every default)."""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Smart Multilingual Audio Guide - Cu Chi Tunnels"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = (
        "mysql+pymysql://museum_app_user:app_password_456@localhost:3306/smart_museum?charset=utf8mb4"
    )
    JWT_SECRET_KEY: str = "smart-museum-dev-placeholder-jwt-key"
    SECRET_KEY: str = "smart-museum-dev-placeholder-jwt-key"
    JWT_ALGORITHM: str = "HS256"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    IDLE_TIMEOUT_MINUTES: int = 30
    BCRYPT_ROUNDS: int = 12
    ADMIN_SESSION_COOKIE_NAME: str = "admin_session"
    IS_COOKIE_SECURE: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE_SECONDS: int = 1800

    # Media Storage Settings
    STATIC_DIR: str = DEFAULT_STATIC_DIR
    IMAGE_UPLOAD_DIR: str = DEFAULT_IMAGE_UPLOAD_DIR
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # Payment Gateway Settings (US 06.1)
    PAYOS_CLIENT_ID: str = ""
    PAYOS_API_KEY: str = ""
    PAYOS_CHECKSUM_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLIC_KEY: str = ""
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"
    PAYPAL_CURRENCY: str = "USD"
    PAYPAL_EXCHANGE_RATE: float = 25000.0
    AUDIO_GUIDE_SERVICE_FEE: int = 50000
    SERVICE_FEE_CURRENCY: str = "VND"
    CLOUDFLARE_TUNNEL_URL: str = ""
    TRANSLATION_PACING_DELAY: float = 1.5

    # AI & Cloud Translation Settings (US 04.4)
    GEMINI_API_KEYS: str = ""
    GOOGLE_TRANSLATE_API_KEYS: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OFFLINE_TRANSLATOR_URL: str = "http://localhost:8001"

    # Geographic Perimeter Bounds
    ALLOW_GLOBAL_COORDINATES: bool = True
    CU_CHI_BOUNDS: dict[str, float] = {
        "min_lat": 11.136361,
        "max_lat": 11.149306,
        "min_lng": 106.455139,
        "max_lng": 106.467639,
    }

    @property
    def gemini_keys_list(self) -> list[str]:
        """Parse comma-separated Gemini API keys into an explicit list (SISE Compliant)."""
        # Phase 1 Gate: Guard against missing or empty keys
        if not self.GEMINI_API_KEYS or not self.GEMINI_API_KEYS.strip():
            return []

        # Phase 2 Compute: Split and clean individual key tokens
        resolved_keys = [
            k.strip() for k in self.GEMINI_API_KEYS.split(",") if k.strip()
        ]

        # Phase 3 Exit: Single structured return
        return resolved_keys

    @property
    def google_translate_keys_list(self) -> list[str]:
        """Parse comma-separated Google Translate API keys into an explicit list (SISE Compliant)."""
        # Phase 1 Gate: Guard against missing or empty keys
        if (
            not self.GOOGLE_TRANSLATE_API_KEYS
            or not self.GOOGLE_TRANSLATE_API_KEYS.strip()
        ):
            return []

        # Phase 2 Compute: Split and clean individual key tokens
        resolved_keys = [
            k.strip() for k in self.GOOGLE_TRANSLATE_API_KEYS.split(",") if k.strip()
        ]

        # Phase 3 Exit: Single structured return
        return resolved_keys


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton (cached after the first call)."""
    resolved_settings = Settings()
    return resolved_settings


settings = get_settings()

# Ensure static directories exist
os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
