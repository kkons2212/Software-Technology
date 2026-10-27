"""Pydantic schemas for Multilingual POI Translation Audit (US 04.1)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TranslationUpdateRequest(BaseModel):
    """Payload for updating target translation text during historical audit."""

    title: str | None = Field(None, min_length=1, max_length=255)
    short_description: str | None = Field(None, max_length=255)
    description: str | None = None
    status: str | None = Field(None, max_length=50)


class TranslationResponse(BaseModel):
    """Complete translation audit item schema including source Vietnamese comparison."""

    stran_id: str
    poi_id: str
    poi_title: str | None = None
    language_id: str
    language_name: str | None = None
    title: str
    short_description: str | None = None
    description: str | None = None
    status: str
    audio_url: str | None = None
    audio_status: str | None = None
    source_title: str | None = None
    source_short_description: str | None = None
    source_description: str | None = None
    review_by: str | None = None
    review_at: datetime | None = None
    user_name: str | None = None
    create_at: datetime | None = None
    update_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TranslationListResponse(BaseModel):
    """Paginated collection of translation audit items."""

    items: list[TranslationResponse]
    total: int
