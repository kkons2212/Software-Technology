"""Wayfinding Service (US 01.4 - TSK-01.4.1).

Computes optimal walking routes using OpenStreetMap (OSRM) Foot Routing
with automatic direct-line connector fallback for off-road waypoints and offline resilience.

Produces GeoJSON LineString payloads compliant with RFC 7946 with calculation latency < 500ms.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import httpx

from app.core.config import settings
from app.core.exceptions import ApiError
from app.core.geography import haversine_distance
from app.schemas.tour_schema import (
    GeoJsonLineStringGeometry,
    GeoJsonRouteFeature,
    RouteDestinationInfo,
    RouteProperties,
    RouteWaypoint,
)

if TYPE_CHECKING:
    from app.models.poi import POI
    from app.repositories.poi_repository import POIRepository

logger = logging.getLogger(__name__)

# Walking speed constant: ~1.2 m/s -> 72 meters per minute
WALKING_SPEED_METERS_PER_MINUTE = 72.0

# Timeout for OSRM public foot routing to guarantee backend SLA (< 800ms)
OSRM_TIMEOUT_SECONDS = 0.8
OSRM_FOOT_ROUTING_URL = "https://routing.openstreetmap.de/routed-foot/route/v1/driving/{origin_lng},{origin_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson"


class WayfindingService:
    """Service computing authentic walking paths along OpenStreetMap footways with direct fallback."""

    def __init__(self, poi_repository: POIRepository, db_session=None) -> None:
        self.poi_repository = poi_repository
        self.db = db_session

    def _parse_osrm_route_coords(
        self, payload: dict
    ) -> tuple[list[list[float]], float] | None:
        """Extract coordinates and distance from OSRM response payload (SISE Helper)."""
        resolved: tuple[list[list[float]], float] | None = None
        routes = payload.get("routes", [])
        if routes:
            best = routes[0]
            coords = best.get("geometry", {}).get("coordinates")
            dist = float(best.get("distance", 0.0))
            if coords and len(coords) >= 2 and dist > 0:
                resolved = (coords, dist)
        return resolved

    def _try_osrm_foot_route(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> tuple[list[list[float]], float] | None:
        """Query OpenStreetMap Foot Routing service for detailed curved geometry."""
        resolved_route: tuple[list[list[float]], float] | None = None
        url = OSRM_FOOT_ROUTING_URL.format(
            origin_lng=origin_lng,
            origin_lat=origin_lat,
            dest_lng=dest_lng,
            dest_lat=dest_lat,
        )
        try:
            with httpx.Client(timeout=OSRM_TIMEOUT_SECONDS) as client:
                response = client.get(url)
                if response.status_code == 200:
                    resolved_route = self._parse_osrm_route_coords(response.json())
        except Exception as exc:
            logger.info(
                "OSRM routing unavailable (%s), falling back to direct line", exc
            )

        return resolved_route

    def _resolve_route_coordinates(
        self,
        origin_lat: float,
        origin_lng: float,
        poi_lat: float,
        poi_lng: float,
    ) -> tuple[list[list[float]], float]:
        """Resolve route using Direct OSRM foot routing with direct connector fallback (SISE Compliant)."""
        # Phase 1 Gate: Micro-proximity (<= 35m) routes directly
        direct_dist = haversine_distance(origin_lat, origin_lng, poi_lat, poi_lng)
        if direct_dist <= 35.0:
            return (
                [
                    [round(origin_lng, 6), round(origin_lat, 6)],
                    [round(poi_lng, 6), round(poi_lat, 6)],
                ],
                direct_dist,
            )

        # Phase 2 Compute: Try OSRM foot routing
        osrm_result = self._try_osrm_foot_route(
            origin_lat, origin_lng, poi_lat, poi_lng
        )
        resolved_route: tuple[list[list[float]], float] | None = None

        if osrm_result is not None:
            coords, osrm_dist = osrm_result
            last_lng, last_lat = coords[-1]
            dist_to_poi = haversine_distance(last_lat, last_lng, poi_lat, poi_lng)

            # If OSRM terminates short of off-road exhibit (> 20m), append direct leg to POI
            if dist_to_poi > 20.0:
                extended_coords = list(coords)
                extended_coords.append([round(poi_lng, 6), round(poi_lat, 6)])
                resolved_route = (extended_coords, osrm_dist + dist_to_poi)
            else:
                resolved_route = (coords, osrm_dist)
        else:
            # Fallback when OSRM is unavailable or times out
            fallback_coords = [
                [round(origin_lng, 6), round(origin_lat, 6)],
                [round(poi_lng, 6), round(poi_lat, 6)],
            ]
            resolved_route = (fallback_coords, direct_dist)

        # Phase 3 Exit: Unified return
        return resolved_route

    def _is_within_museum_bounds(self, lat: float, lng: float) -> bool:
        """Validate if coordinate pair falls within Cu Chi complex boundaries."""
        bounds = settings.CU_CHI_BOUNDS
        is_within_lat = bounds["min_lat"] <= lat <= bounds["max_lat"]
        is_within_lng = bounds["min_lng"] <= lng <= bounds["max_lng"]
        return bool(is_within_lat and is_within_lng)

    def _validate_walking_route_preconditions(
        self, origin_lat: float, origin_lng: float, destination_poi_id: str
    ) -> POI:
        """Validate origin coordinates and ensure target POI exists and is active (SISE Gate)."""
        if not (-90.0 <= origin_lat <= 90.0 and -180.0 <= origin_lng <= 180.0):
            raise ApiError(
                code="INVALID_COORDINATES",
                message="Origin coordinates are outside valid geographic range (-90..90, -180..180).",
                status_code=422,
                details={"origin_lat": origin_lat, "origin_lng": origin_lng},
            )

        poi = self.poi_repository.get_by_id(destination_poi_id)
        if not poi:
            raise ApiError(
                code="POI_NOT_FOUND",
                message=f"Exhibit '{destination_poi_id}' not found.",
                status_code=404,
                details={"destination_poi_id": destination_poi_id},
            )

        if not poi.is_active:
            raise ApiError(
                code="POI_DEACTIVATED",
                message=f"Exhibit '{poi.title}' has been deactivated and is not available for navigation.",
                status_code=404,
                details={"destination_poi_id": destination_poi_id, "is_active": False},
            )

        return poi

    def calculate_walking_route(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_poi_id: str,
    ) -> GeoJsonRouteFeature:
        """Calculate intelligent walking route using OSM curvature + direct fallback (SISE Compliant)."""
        # Phase 1 Gate: Validate preconditions via dedicated helper
        poi = self._validate_walking_route_preconditions(
            origin_lat, origin_lng, destination_poi_id
        )

        # Phase 2 Compute: Routing
        poi_lat = float(poi.latitude)
        poi_lng = float(poi.longitude)
        trigger_radius = float(
            getattr(poi, "radius", None) or getattr(poi, "trigger_radius", None) or 30.0
        )

        geojson_coordinates, total_distance = self._resolve_route_coordinates(
            origin_lat, origin_lng, poi_lat, poi_lng
        )

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

        route_feature = GeoJsonRouteFeature(
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

        # Phase 3 Exit: Single unified return
        return route_feature
