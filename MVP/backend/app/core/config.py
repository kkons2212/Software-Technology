"""Application configuration module using Pydantic Settings."""

import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Multilingual Audio Guide - Cu Chi Tunnels"
    API_V1_STR: str = "/api/v1"

    # Database Configuration (Defaults to Docker MySQL container)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://museum_app_user:app_password_456@localhost:3306/smart_museum?charset=utf8mb4",
    )

    # JWT Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_museum_super_secret_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Media Storage Settings
    STATIC_DIR: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "static")
    )
    IMAGE_UPLOAD_DIR: str = os.path.join(STATIC_DIR, "images")
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # Cu Chi Tunnels Geographic Perimeter Bounds
    CU_CHI_BOUNDS: dict = {
        "min_lat": 11.1350,
        "max_lat": 11.1550,
        "min_lng": 106.4500,
        "max_lng": 106.4750,
    }

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure static directories exist
os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
