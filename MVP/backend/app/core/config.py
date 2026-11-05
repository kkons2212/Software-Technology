"""Application configuration resolved from environment variables (Pydantic Settings)."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_FILE_PATH = os.path.join(BACKEND_DIR, ".env")
DEFAULT_STATIC_DIR = os.path.join(BACKEND_DIR, "static")
DEFAULT_IMAGE_UPLOAD_DIR = os.path.join(DEFAULT_STATIC_DIR, "images")

# Module-level defaults for backward compatibility with existing tests
DEFAULT_BCRYPT_ROUNDS = 12
DEFAULT_JWT_ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60
DEFAULT_IDLE_TIMEOUT_MINUTES = 30
DEFAULT_ADMIN_SESSION_COOKIE_NAME = "admin_session"
DEFAULT_IS_COOKIE_SECURE = False
DEFAULT_DB_POOL_SIZE = 10
DEFAULT_DB_MAX_OVERFLOW = 20
DEFAULT_DB_POOL_RECYCLE_SECONDS = 1800
DEFAULT_PAYPAL_MODE = "sandbox"
DEFAULT_PAYPAL_CURRENCY = "USD"
DEFAULT_PAYPAL_EXCHANGE_RATE = 25000.0
DEFAULT_AUDIO_GUIDE_SERVICE_FEE = 50000
DEFAULT_SERVICE_FEE_CURRENCY = "VND"
DEFAULT_TRANSLATION_PACING_DELAY = 1.5
DEFAULT_OFFLINE_TRANSLATOR_URL = "http://localhost:8001"


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
    ENVIRONMENT: str = "production"

    DATABASE_URL: str = (
        "mysql+pymysql://museum_app_user:app_password_456@localhost:3306/smart_museum?charset=utf8mb4"
    )
    JWT_SECRET_KEY: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-fA-F]{64}$",
        description="Required 256-bit JWT signing key encoded as 64 hexadecimal characters.",
    )
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

    # Cloud Object Storage (Supabase Storage)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET_NAME: str = "museum-media"

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
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "stealth/crouton-alpha"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    TRANSLATION_PROVIDERS_ORDER: str = (
        "openrouter,offline,google_cloud,gemini,deep_translator"
    )

    @property
    def is_development(self) -> bool:
        """Return whether development-only features may be enabled."""
        return self.ENVIRONMENT.strip().lower() == "development"

    # Geographic Perimeter Bounds
    ALLOW_GLOBAL_COORDINATES: bool = False
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

    @property
    def translation_providers_list(self) -> list[str]:
        """Parse comma-separated translation providers order (SISE Compliant)."""
        if (
            not self.TRANSLATION_PROVIDERS_ORDER
            or not self.TRANSLATION_PROVIDERS_ORDER.strip()
        ):
            return [
                "openrouter",
                "offline",
                "google_cloud",
                "gemini",
                "deep_translator",
            ]
        return [
            p.strip().lower()
            for p in self.TRANSLATION_PROVIDERS_ORDER.split(",")
            if p.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton (cached after the first call)."""
    resolved_settings = Settings()
    return resolved_settings


settings = get_settings()

# Ensure static directories exist
os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
