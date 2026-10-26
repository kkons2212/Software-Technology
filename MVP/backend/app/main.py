"""FastAPI application entry point (US 02.1).

Builds the application, installs the standardized error envelope and registers
every domain router.
"""

from fastapi import FastAPI

from app.controllers.auth_controller import router as auth_router
from app.core.exceptions import register_error_handlers

API_TITLE = "Smart Multilingual Automated Audio Guide & Interactive Map API"
API_VERSION = "1.0.0"


def create_app() -> FastAPI:
    """Build the FastAPI application instance with all routers registered."""
    application = FastAPI(title=API_TITLE, version=API_VERSION)
    register_error_handlers(application)
    application.include_router(auth_router)
    return application


app = create_app()
