"""Wayfinding Service (US 01.4 - TSK-01.4.1).

Computes dynamic walking routes connecting the visitor's live GPS coordinates
directly with target exhibits loaded from the database within the Cu Chi Tunnels
Historical Site perimeter. Produces GeoJSON LineString payloads compliant with
RFC 7946 with calculation latency < 500ms.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from app.core.config import settings
from app.core.exceptions import ApiError
from app.schemas.tour_schema import (
    GeoJsonLineStringGeometry,
    GeoJsonRouteFeature,
    RouteDestinationInfo,
    RouteProperties,
    RouteWaypoint,
)

if TYPE_CHECKING:
    from app.repositories.poi_repository import POIRepository

# Walking speed constant: ~1.2 m/s -> 72 meters per minute
WALKING_SPEED_METERS_PER_MINUTE = 72.0


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    earth_radius_m = 6_371_000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_m * c


class WayfindingService:
    """Service for computing dynamic walking routes directly to exhibits from database."""

    def __init__(self, poi_repository: POIRepository, db_session=None) -> None:
        self.poi_repository = poi_repository
        self.db = db_session

    def _is_within_museum_bounds(self, lat: float, lng: float) -> bool:
        """Validate if coordinate pair falls within Cu Chi complex boundaries."""
        bounds = settings.CU_CHI_BOUNDS
        return (
            bounds["min_lat"] <= lat <= bounds["max_lat"]
            and bounds["min_lng"] <= lng <= bounds["max_lng"]
        )

    def calculate_walking_route(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_poi_id: str,
    ) -> GeoJsonRouteFeature:
        """Calculate dynamic walking route from origin GPS to the target exhibit.

        Steps:
        1. Validate origin coordinate resides within Cu Chi relic perimeter.
        2. Query POI dynamically from database (verifies existence).
        3. Check exhibit is active (US 03.3: returns 404 POI_DEACTIVATED if disabled).
        4. Construct dynamic direct route polyline connecting visitor GPS to exhibit coordinates.
        5. Return GeoJSON LineString Feature with distance and walking time.
        """
        # 1. Validate origin coordinates
        if not self._is_within_museum_bounds(origin_lat, origin_lng):
            raise ApiError(
                code="COORDINATES_OUT_OF_BOUNDS",
                message="Origin coordinates are outside Cu Chi Historical Relic Site boundaries.",
                status_code=422,
                details={
                    "origin_lat": origin_lat,
                    "origin_lng": origin_lng,
                    "bounds": settings.CU_CHI_BOUNDS,
                },
            )

        # 2. Look up destination POI dynamically from DB
        poi = self.poi_repository.get_by_id(destination_poi_id)
        if not poi:
            raise ApiError(
                code="POI_NOT_FOUND",
                message=f"Exhibit '{destination_poi_id}' not found.",
                status_code=404,
                details={"destination_poi_id": destination_poi_id},
            )

        # 3. Check if exhibit is active (US 03.3)
        if not poi.is_active:
            raise ApiError(
                code="POI_DEACTIVATED",
                message=f"Exhibit '{poi.title}' has been deactivated and is not available for navigation.",
                status_code=404,
                details={"destination_poi_id": destination_poi_id, "is_active": False},
            )

        poi_lat = float(poi.latitude)
        poi_lng = float(poi.longitude)
        trigger_radius = float(
            getattr(poi, "radius", None) or getattr(poi, "trigger_radius", None) or 30.0
        )

        # 4. Compute direct distance
        total_distance = haversine_distance(origin_lat, origin_lng, poi_lat, poi_lng)

        # Coordinates for GeoJSON LineString format: [lng, lat] per RFC 7946
        geojson_coordinates = [
            [round(origin_lng, 6), round(origin_lat, 6)],
            [round(poi_lng, 6), round(poi_lat, 6)],
        ]

        origin_waypoint = RouteWaypoint(
            lat=round(origin_lat, 6),
            lng=round(origin_lng, 6),
            name="Vị trí hiện tại của bạn",
        )

        destination_info = RouteDestinationInfo(
            poi_id=str(
                getattr(poi, "poi_id", None) or getattr(poi, "id", destination_poi_id)
            ),
            title=poi.title,
            lat=round(poi_lat, 6),
            lng=round(poi_lng, 6),
            trigger_radius=int(round(trigger_radius)),
        )

        estimated_minutes = max(
            1.0,
            round(total_distance / WALKING_SPEED_METERS_PER_MINUTE, 1),
        )

        return GeoJsonRouteFeature(
            type="Feature",
            geometry=GeoJsonLineStringGeometry(
                type="LineString",
                coordinates=geojson_coordinates,
            ),
            properties=RouteProperties(
                origin=origin_waypoint,
                destination=destination_info,
                total_distance_meters=round(total_distance, 1),
                estimated_walking_minutes=estimated_minutes,
            ),
        )
