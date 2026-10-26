"""FastAPI application entrypoint and route configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.controllers.poi_controller import router as poi_router
from app.controllers.telemetry_controller import router as telemetry_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.language_controller import router as language_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware allowing localhost frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for images and media
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Register API Routers
app.include_router(poi_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router)
app.include_router(auth_router)
app.include_router(language_router)





@app.get("/health", tags=["System Health"])
def health_check():
    """Liveness probe for backend application server."""
    return {"status": "ok", "service": settings.PROJECT_NAME}
