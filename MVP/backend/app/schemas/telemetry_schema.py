"""Pydantic schemas for Telemetry Ingestion (US 01.3)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TelemetryTriggerCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str | None = Field(
        None,
        alias="SessionID",
        description="Visitor session ID (guest session created if omitted)",
    )
    poi_id: str = Field(
        ..., alias="PoiID", description="Triggered Point of Interest ID"
    )
    dwell_time: int = Field(
        0,
        alias="DwellTime",
        ge=0,
        description="Dwell time in seconds spent within geofence",
    )
    trigger_type: str | None = Field(
        "AUTO_GEOFENCE", alias="TriggerType", description="AUTO_GEOFENCE or MANUAL_TAP"
    )
    preferred_language: str | None = Field(
        None,
        alias="PreferredLanguage",
        min_length=2,
        max_length=20,
        description="Visitor language code used for language demographic analytics (US 05.2)",
    )


class TelemetryTriggerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trigger_id: str
    session_id: str
    poi_id: str
    dwell_time: int
    trigger_at: datetime
