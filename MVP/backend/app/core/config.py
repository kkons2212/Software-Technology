"""Application configuration resolved from environment variables (Pydantic Settings)."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# ------------------------------------------------------------------------------
# MODULE-LEVEL DEFAULTS
# ------------------------------------------------------------------------------
DEFAULT_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://museum_app_user:app_password_456@localhost:3306/smart_museum?charset=utf8mb4",
)
DEFAULT_JWT_ALGORITHM = "HS256"
DEFAULT_JWT_SECRET_KEY = "smart-museum-dev-placeholder-jwt-key"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60
DEFAULT_IDLE_TIMEOUT_MINUTES = 30
DEFAULT_BCRYPT_ROUNDS = 12
DEFAULT_ADMIN_SESSION_COOKIE_NAME = "admin_session"
DEFAULT_IS_COOKIE_SECURE = False
DEFAULT_DB_POOL_SIZE = 10
DEFAULT_DB_MAX_OVERFLOW = 20
DEFAULT_DB_POOL_RECYCLE_SECONDS = 1800

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_STATIC_DIR = os.path.join(BACKEND_DIR, "static")
DEFAULT_IMAGE_UPLOAD_DIR = os.path.join(DEFAULT_STATIC_DIR, "images")

# Payment Gateway Defaults (US 06.1)
DEFAULT_PAYOS_CLIENT_ID = os.getenv("PAYOS_CLIENT_ID", "")
DEFAULT_PAYOS_API_KEY = os.getenv("PAYOS_API_KEY", "")
DEFAULT_PAYOS_CHECKSUM_KEY = os.getenv("PAYOS_CHECKSUM_KEY", "")
DEFAULT_STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
DEFAULT_STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY", "")
DEFAULT_PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
DEFAULT_PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
DEFAULT_PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")
DEFAULT_PAYPAL_CURRENCY = os.getenv("PAYPAL_CURRENCY", "USD")
DEFAULT_PAYPAL_EXCHANGE_RATE = float(os.getenv("PAYPAL_EXCHANGE_RATE", "25000.0"))
DEFAULT_AUDIO_GUIDE_SERVICE_FEE = int(os.getenv("AUDIO_GUIDE_SERVICE_FEE", "50000"))
DEFAULT_SERVICE_FEE_CURRENCY = os.getenv("SERVICE_FEE_CURRENCY", "VND")
DEFAULT_CLOUDFLARE_TUNNEL_URL = os.getenv("CLOUDFLARE_TUNNEL_URL", "").strip()


class Settings(BaseSettings):
    """Runtime configuration (environment variables override every default)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Smart Multilingual Audio Guide - Cu Chi Tunnels"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = DEFAULT_DATABASE_URL
    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET_KEY
    SECRET_KEY: str = DEFAULT_JWT_SECRET_KEY
    JWT_ALGORITHM: str = DEFAULT_JWT_ALGORITHM
    ALGORITHM: str = DEFAULT_JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES
    IDLE_TIMEOUT_MINUTES: int = DEFAULT_IDLE_TIMEOUT_MINUTES
    BCRYPT_ROUNDS: int = DEFAULT_BCRYPT_ROUNDS
    ADMIN_SESSION_COOKIE_NAME: str = DEFAULT_ADMIN_SESSION_COOKIE_NAME
    IS_COOKIE_SECURE: bool = DEFAULT_IS_COOKIE_SECURE
    DB_POOL_SIZE: int = DEFAULT_DB_POOL_SIZE
    DB_MAX_OVERFLOW: int = DEFAULT_DB_MAX_OVERFLOW
    DB_POOL_RECYCLE_SECONDS: int = DEFAULT_DB_POOL_RECYCLE_SECONDS

    # Media Storage Settings
    STATIC_DIR: str = DEFAULT_STATIC_DIR
    IMAGE_UPLOAD_DIR: str = DEFAULT_IMAGE_UPLOAD_DIR
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # Payment Gateway Settings (US 06.1)
    PAYOS_CLIENT_ID: str = DEFAULT_PAYOS_CLIENT_ID
    PAYOS_API_KEY: str = DEFAULT_PAYOS_API_KEY
    PAYOS_CHECKSUM_KEY: str = DEFAULT_PAYOS_CHECKSUM_KEY
    STRIPE_SECRET_KEY: str = DEFAULT_STRIPE_SECRET_KEY
    STRIPE_PUBLIC_KEY: str = DEFAULT_STRIPE_PUBLIC_KEY
    PAYPAL_CLIENT_ID: str = DEFAULT_PAYPAL_CLIENT_ID
    PAYPAL_CLIENT_SECRET: str = DEFAULT_PAYPAL_CLIENT_SECRET
    PAYPAL_MODE: str = DEFAULT_PAYPAL_MODE
    PAYPAL_CURRENCY: str = DEFAULT_PAYPAL_CURRENCY
    PAYPAL_EXCHANGE_RATE: float = DEFAULT_PAYPAL_EXCHANGE_RATE
    AUDIO_GUIDE_SERVICE_FEE: int = DEFAULT_AUDIO_GUIDE_SERVICE_FEE
    SERVICE_FEE_CURRENCY: str = DEFAULT_SERVICE_FEE_CURRENCY
    CLOUDFLARE_TUNNEL_URL: str = DEFAULT_CLOUDFLARE_TUNNEL_URL

    # AI & Cloud Translation Settings (US 04.4)
    GEMINI_API_KEYS: str = os.getenv("GEMINI_API_KEYS", "")
    GOOGLE_TRANSLATE_API_KEYS: str = os.getenv("GOOGLE_TRANSLATE_API_KEYS", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    @property
    def gemini_keys_list(self) -> list[str]:
        if not self.GEMINI_API_KEYS:
            return []
        return [k.strip() for k in self.GEMINI_API_KEYS.split(",") if k.strip()]

    @property
    def google_translate_keys_list(self) -> list[str]:
        if not self.GOOGLE_TRANSLATE_API_KEYS:
            return []
        return [
            k.strip() for k in self.GOOGLE_TRANSLATE_API_KEYS.split(",") if k.strip()
        ]

    # Cu Chi Tunnels Geographic Perimeter Bounds
    CU_CHI_BOUNDS: dict = {
        "min_lat": 11.136361,
        "max_lat": 11.149306,
        "min_lng": 106.455139,
        "max_lng": 106.467639,
    }


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton (cached after the first call)."""
    return Settings()


settings = get_settings()

# Ensure static directories exist
os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
