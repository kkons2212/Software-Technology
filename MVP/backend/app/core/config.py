"""Application configuration resolved from environment variables (Pydantic Settings).

US 02.1 - Administrator Authentication & Portal Login.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# ------------------------------------------------------------------------------
# MODULE-LEVEL DEFAULTS (every value is overridable through an OS env variable)
# ------------------------------------------------------------------------------
DEFAULT_DATABASE_URL = (
    "mysql+pymysql://root:root@127.0.0.1:3306/smart_museum?charset=utf8mb4"
)
DEFAULT_JWT_ALGORITHM = "HS256"
# Development placeholder only: production deployments MUST inject the real
# signing material through the JWT_SECRET_KEY environment variable.
DEFAULT_JWT_SECRET_KEY = "smart-museum-dev-placeholder-jwt-key"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60
DEFAULT_IDLE_TIMEOUT_MINUTES = 30
DEFAULT_BCRYPT_ROUNDS = 12
DEFAULT_ADMIN_SESSION_COOKIE_NAME = "admin_session"
DEFAULT_IS_COOKIE_SECURE = False
DEFAULT_DB_POOL_SIZE = 10
DEFAULT_DB_MAX_OVERFLOW = 20
DEFAULT_DB_POOL_RECYCLE_SECONDS = 1800


class Settings(BaseSettings):
    """Runtime configuration (environment variables override every default)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = DEFAULT_DATABASE_URL
    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET_KEY
    JWT_ALGORITHM: str = DEFAULT_JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES
    IDLE_TIMEOUT_MINUTES: int = DEFAULT_IDLE_TIMEOUT_MINUTES
    # Bcrypt cost factor is hard-capped at a minimum of 12 (AC-02.1.2).
    BCRYPT_ROUNDS: int = DEFAULT_BCRYPT_ROUNDS
    ADMIN_SESSION_COOKIE_NAME: str = DEFAULT_ADMIN_SESSION_COOKIE_NAME
    IS_COOKIE_SECURE: bool = DEFAULT_IS_COOKIE_SECURE
    DB_POOL_SIZE: int = DEFAULT_DB_POOL_SIZE
    DB_MAX_OVERFLOW: int = DEFAULT_DB_MAX_OVERFLOW
    DB_POOL_RECYCLE_SECONDS: int = DEFAULT_DB_POOL_RECYCLE_SECONDS


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton (cached after the first call)."""
    return Settings()
