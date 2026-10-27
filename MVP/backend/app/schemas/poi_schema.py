"""Request and response schemas for the public map and Admin POI APIs."""

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
    short_description: str | None
    image_url: str | None
    latitude: float
    longitude: float
    trigger_radius: int = Field(
        validation_alias=AliasChoices("trigger_radius", "radius")
    )


class POIUpdateRequest(BaseModel):
    """Partial POI update shared by every Admin write.

    Deliberately partial so one endpoint (`PUT /api/v1/admin/pois/{poi_id}`)
    serves the geofence calibration screen now (US 03.2) and the full exhibit
    editor later (US 03.4); at least one field must be supplied.
    """

    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    radius: int | None = Field(
        default=None, ge=MIN_TRIGGER_RADIUS, le=MAX_TRIGGER_RADIUS
    )

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "POIUpdateRequest":
        if self.latitude is None and self.longitude is None and self.radius is None:
            raise ValueError("Provide at least one of latitude, longitude or radius.")
        return self


class POIUpdateResponse(BaseModel):
    """Successful POI write envelope consumed by the Admin Portal."""

    success: bool = True
    data: POIMapItem
