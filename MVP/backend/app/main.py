"""main.py module"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.language_controller import router as language_router
from app.controllers.poi_controller import router as poi_router

app = FastAPI(title="Smart Museum Visitor API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(language_router)
app.include_router(poi_router)
