"""Pydantic schemas for POI exhibition management and public map APIs."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    data: T


class PublishedLanguage(BaseModel):
    code: str
    language_name: str
    status: str


class POIMapItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    short_description: str | None = None
    image_url: str | None = None
    latitude: float
    longitude: float
    trigger_radius: int


class POICreateRequest(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Primary Vietnamese exhibit title",
    )
    short_description: str | None = Field(
        None, max_length=255, description="Free summary for teaser preview"
    )
    description: str | None = Field(
        None, description="Detailed historical narration content"
    )
    latitude: float = Field(
        ..., ge=-90.0, le=90.0, description="WGS84 latitude coordinate"
    )
    longitude: float = Field(
        ..., ge=-180.0, le=180.0, description="WGS84 longitude coordinate"
    )
    radius: int = Field(
        30,
        ge=10,
        le=50,
        description="Individual geofence proximity trigger radius in meters",
    )
    image_url: str | None = Field(
        None, description="URL or relative path to uploaded cover image"
    )


class POITranslationStatusResponse(BaseModel):
    language_id: str
    status: str = "PENDING"
    title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class POIResponse(BaseModel):
    poi_id: str
    title: str
    short_description: str | None = None
    description: str | None = None
    image_url: str | None = None
    latitude: float
    longitude: float
    radius: int = 30
    is_active: bool = True
    create_at: datetime
    update_at: datetime
    create_by: str | None = None
    translations: list[POITranslationStatusResponse] = []

    model_config = ConfigDict(from_attributes=True)


class POIListResponse(BaseModel):
    items: list[POIResponse]
    total: int
    page: int = 1
    size: int = 50
