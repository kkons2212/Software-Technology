"""FastAPI application entry point (US 02.1).

Builds the application, installs the standardized error envelope and registers
every domain router.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.admin_poi_controller import router as admin_poi_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.language_controller import router as language_router
from app.controllers.poi_controller import router as poi_router
from app.core.exceptions import register_error_handlers

API_TITLE = "Smart Multilingual Automated Audio Guide & Interactive Map API"
API_VERSION = "1.0.0"
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def create_app() -> FastAPI:
    """Build the FastAPI application instance with all routers registered."""
    application = FastAPI(title=API_TITLE, version=API_VERSION)

    allowed_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],
    )

    register_error_handlers(application)
    application.include_router(auth_router)
    application.include_router(language_router)
    application.include_router(poi_router)
    application.include_router(admin_poi_router)
    return application


app = create_app()
