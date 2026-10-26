"""Pydantic schemas for POI exhibition management."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class POICreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Primary Vietnamese exhibit title")
    short_description: Optional[str] = Field(None, max_length=255, description="Free summary for teaser preview")
    description: Optional[str] = Field(None, description="Detailed historical narration content")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude coordinate")
    radius: int = Field(30, ge=10, le=50, description="Individual geofence proximity trigger radius in meters")
    image_url: Optional[str] = Field(None, description="URL or relative path to uploaded cover image")


class POITranslationStatusResponse(BaseModel):
    language_id: str
    status: str = "PENDING"
    title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class POIResponse(BaseModel):
    poi_id: str
    title: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    radius: int = 30
    is_active: bool = True
    create_at: datetime
    update_at: datetime
    create_by: Optional[str] = None
    translations: List[POITranslationStatusResponse] = []

    model_config = ConfigDict(from_attributes=True)


class POIListResponse(BaseModel):
    items: List[POIResponse]
    total: int
    page: int = 1
    size: int = 50
