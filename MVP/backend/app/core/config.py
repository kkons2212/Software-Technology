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
