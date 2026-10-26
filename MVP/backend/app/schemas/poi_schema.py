"""Response schemas for public map APIs."""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

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
    short_description: str | None
    image_url: str | None
    latitude: float
    longitude: float
    trigger_radius: int
