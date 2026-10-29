"""Pydantic schemas for POI exhibition management and public map APIs."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator

T = TypeVar("T")


# Geofence trigger radius bounds (metres) shared with the Admin radius slider.

MIN_TRIGGER_RADIUS = 10

MAX_TRIGGER_RADIUS = 50

DEFAULT_TRIGGER_RADIUS = 30


class APIResponse(BaseModel, Generic[T]):
    data: T


class PublishedLanguage(BaseModel):
    code: str

    language_name: str

    status: str


class POIMapItem(BaseModel):
    """Map-facing projection of an exhibit.



    Built either from keyword arguments (the public map read path) or straight

    from a `POI` ORM row via `model_validate`. `AliasChoices` bridges the two

    because the table columns are `poi_id`/`radius` while the API contract — and

    therefore the Admin Portal — uses `id`/`trigger_radius`.

    """

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(validation_alias=AliasChoices("id", "poi_id"))

    title: str

    short_description: str | None = None

    image_url: str | None = None

    latitude: float

    longitude: float

    trigger_radius: int = Field(
        validation_alias=AliasChoices("trigger_radius", "radius")
    )
    description: str | None = Field(
        default=None,
        description="Detailed historical narrative (unlocked for paid visitors)",
    )
    audio_url: str | None = Field(
        default=None,
        description="Protected audio stream URL (unlocked for paid visitors)",
    )
    is_locked: bool | None = Field(
        default=None,
        description="Content lock state: False for unlocked, None/True for locked teaser",
    )


class POIUpdateRequest(BaseModel):
    """Partial POI update shared by every Admin write.



    Deliberately partial so one endpoint (`PUT /api/v1/admin/pois/{poi_id}`)

    serves the geofence calibration screen (US 03.2) and the full exhibit

    editor (US 03.4); at least one field must be supplied.

    """

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Primary Vietnamese exhibit title",
    )

    short_description: str | None = Field(
        default=None,
        max_length=255,
        description="Free summary for teaser preview",
    )

    description: str | None = Field(
        default=None,
        description="Detailed historical narration content",
    )

    image_url: str | None = Field(
        default=None,
        description="URL or relative path to uploaded cover image",
    )

    latitude: float | None = Field(
        default=None, ge=-90.0, le=90.0, description="WGS84 latitude coordinate"
    )

    longitude: float | None = Field(
        default=None, ge=-180.0, le=180.0, description="WGS84 longitude coordinate"
    )

    radius: int | None = Field(
        default=None,
        ge=MIN_TRIGGER_RADIUS,
        le=MAX_TRIGGER_RADIUS,
        description="Geofence proximity trigger radius in metres",
    )

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "POIUpdateRequest":
        if (
            self.title is None
            and self.short_description is None
            and self.description is None
            and self.image_url is None
            and self.latitude is None
            and self.longitude is None
            and self.radius is None
        ):
            raise ValueError("Provide at least one field to update.")

        return self


class POIVisibilityUpdateRequest(BaseModel):
    """Payload to toggle POI visibility (US 03.3)."""

    is_active: bool = Field(
        ...,
        description="True to make exhibit visible on visitor maps, False to hide it",
    )


class POIUpdateResponse(BaseModel):
    """Successful POI write envelope consumed by the Admin Portal."""

    success: bool = True

    data: POIMapItem


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
