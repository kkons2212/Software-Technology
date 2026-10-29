"""Tour and Wayfinding Pydantic Schemas (US 01.4).

Standard GeoJSON LineString and walking route metadata schemas.
Complies with RFC 7946 GeoJSON format and project 3-tier layering rules.
"""

from typing import Literal

from pydantic import BaseModel, Field


class RouteWaypoint(BaseModel):
    """Geographic coordinate waypoint."""

    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    name: str | None = Field(
        default=None, description="Optional waypoint or landmark name"
    )


class RouteDestinationInfo(BaseModel):
    """Target destination POI metadata."""

    poi_id: str = Field(..., description="Target POI UUID or identifier")
    title: str = Field(..., description="Target POI exhibit title")
    lat: float = Field(..., description="Target POI latitude")
    lng: float = Field(..., description="Target POI longitude")
    trigger_radius: int = Field(
        default=30, description="POI geofence trigger radius in meters"
    )


class RouteProperties(BaseModel):
    """Metadata properties describing the computed walking route."""

    origin: RouteWaypoint
    destination: RouteDestinationInfo
    total_distance_meters: float = Field(
        ..., description="Total route distance in meters"
    )
    estimated_walking_minutes: float = Field(
        ..., description="Estimated walking time in minutes at 1.2 m/s"
    )


class GeoJsonLineStringGeometry(BaseModel):
    """GeoJSON LineString geometry conforming to RFC 7946: [[lng, lat], ...]."""

    type: Literal["LineString"] = "LineString"
    coordinates: list[list[float]] = Field(
        ...,
        description="Array of [longitude, latitude] coordinate pairs along the walking route",
    )


class GeoJsonRouteFeature(BaseModel):
    """GeoJSON Feature envelope containing walking path geometry and route properties."""

    type: Literal["Feature"] = "Feature"
    geometry: GeoJsonLineStringGeometry
    properties: RouteProperties


class RouteResponse(BaseModel):
    """Standardized API response envelope for walking route calculation."""

    success: bool = True
    data: GeoJsonRouteFeature
