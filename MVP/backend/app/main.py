"""FastAPI application entry point.

Builds the application, installs the standardized error envelope, mounts
static directories, and registers all routers.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.controllers.admin_poi_controller import router as admin_poi_router
from app.controllers.analytics_controller import router as analytics_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.language_controller import router as language_router
from app.controllers.payment_controller import router as payment_router
from app.controllers.poi_controller import router as poi_router
from app.controllers.session_controller import router as session_router
from app.controllers.system_controller import router as system_router
from app.controllers.telemetry_controller import router as telemetry_router
from app.controllers.tour_controller import router as tour_router
from app.controllers.translation_controller import router as translation_router
from app.core.config import settings
from app.core.exceptions import register_error_handlers

API_TITLE = "Smart Multilingual Automated Audio Guide & Interactive Map API"
API_VERSION = "1.0.0"
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"


def create_app() -> FastAPI:
    """Build the FastAPI application instance with all routers registered."""
    application = FastAPI(
        title=API_TITLE,
        version=API_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    allowed_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins if allowed_origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Static file serving for images and media
    os.makedirs(settings.STATIC_DIR, exist_ok=True)
    os.makedirs(settings.IMAGE_UPLOAD_DIR, exist_ok=True)
    application.mount(
        "/static", StaticFiles(directory=settings.STATIC_DIR), name="static"
    )

    register_error_handlers(application)

    application.include_router(auth_router)
    application.include_router(language_router)
    application.include_router(poi_router)
    application.include_router(admin_poi_router)
    application.include_router(telemetry_router)
    application.include_router(translation_router)
    application.include_router(analytics_router)
    application.include_router(payment_router)
    application.include_router(session_router)
    application.include_router(system_router)
    application.include_router(tour_router)

    @application.get("/health", tags=["System Health"])
    def health_check():
        """Liveness probe for backend application server."""
        return {"status": "ok", "service": API_TITLE}

    return application


app = create_app()
