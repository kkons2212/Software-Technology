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
DEFAULT_RENDER_TRANSLATION_API_URL = "https://translation-temporary.onrender.com"
DEFAULT_RENDER_TRANSLATION_TIMEOUT = 70.0


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

    # Rate Limiting Controls
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_CHECKOUT: str = "5/minute"
    RATE_LIMIT_ORDER_STATUS: str = "30/minute"
    RATE_LIMIT_ORDER_SESSION: str = "10/minute"
    RATE_LIMIT_AUDIO_STREAM: str = "20/minute"
    RATE_LIMIT_WALKING_ROUTE: str = "10/minute"
    RATE_LIMIT_TELEMETRY: str = "20/minute"
    RATE_LIMIT_POI_CATALOG: str = "60/minute"
    RATE_LIMIT_AI_TTS: str = "3/minute"
    RATE_LIMIT_UPLOAD_IMAGE: str = "10/minute"
    RATE_LIMIT_CLEAN_ORPHANS: str = "1/5minute"

    # Media Storage Settings
    STATIC_DIR: str = DEFAULT_STATIC_DIR
    IMAGE_UPLOAD_DIR: str = DEFAULT_IMAGE_UPLOAD_DIR
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]
    STORAGE_QUOTA_BYTES: int = (
        1 * 1024 * 1024 * 1024
    )  # 1 GB (Supabase free plan storage limit)

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
    ENABLE_PAYMENT_SIMULATION: bool = False

    # AI & Cloud Translation Settings (US 04.4 - Auto_Translate & OpenRouter)
    RENDER_TRANSLATION_API_URL: str = "https://translation-temporary.onrender.com"
    RENDER_TRANSLATION_TIMEOUT: float = 70.0
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    TRANSLATION_PROVIDERS_ORDER: str = "render_api,openrouter"
    PIPELINE_MAX_CONCURRENCY: int = 1
    PIPELINE_JOB_COOLDOWN_SECONDS: float = 1.5
    PIPELINE_AUTO_RECOVERY: bool = True

    @property
    def is_development(self) -> bool:
        """Return whether development-only features may be enabled."""
        return self.ENVIRONMENT.strip().lower() == "development"

    @property
    def is_payment_simulation_allowed(self) -> bool:
        """Allow payment simulation if in development mode OR explicitly enabled via env."""
        # SECURITY-INVARIANT: Simulation must remain disabled in production unless explicitly toggled (US 06.1)
        is_allowed = bool(self.is_development or self.ENABLE_PAYMENT_SIMULATION)
        return is_allowed

    # Geographic Perimeter Bounds
    ALLOW_GLOBAL_COORDINATES: bool = False
    CU_CHI_BOUNDS: dict[str, float] = {
        "min_lat": 11.136361,
        "max_lat": 11.149306,
        "min_lng": 106.455139,
        "max_lng": 106.467639,
    }

    @property
    def translation_providers_list(self) -> list[str]:
        """Parse comma-separated translation providers order (SISE Compliant)."""
        # Phase 1 Gate: empty string fallback
        if (
            not self.TRANSLATION_PROVIDERS_ORDER
            or not self.TRANSLATION_PROVIDERS_ORDER.strip()
        ):
            return ["render_api", "openrouter"]

        # Phase 2 Compute: parse individual tokens
        tokens = [
            p.strip().lower()
            for p in self.TRANSLATION_PROVIDERS_ORDER.split(",")
            if p.strip()
        ]

        # Phase 3 Exit: return parsed tokens or default if all tokens were whitespace
        if not tokens:
            return ["render_api", "openrouter"]
        return tokens


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton (cached after the first call)."""
    resolved_settings = Settings()
    return resolved_settings


settings = get_settings()

# Ensure static directories exist
os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
