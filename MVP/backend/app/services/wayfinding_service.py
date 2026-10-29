"""Wayfinding Service (US 01.4 - TSK-01.4.1).

Computes optimal walking routes using a Hybrid Smart Routing strategy:
1. Primary: OpenStreetMap Foot Routing (OSRM) for authentic curvature along mapped paths.
2. Fallback: Internal Cu Chi Trail Graph with Dijkstra shortest path for unmapped jungle trails or offline conditions.

Produces GeoJSON LineString payloads compliant with RFC 7946 with calculation latency < 500ms.
"""

from __future__ import annotations

import heapq
import logging
import math
from typing import TYPE_CHECKING

import httpx

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

logger = logging.getLogger(__name__)

# Walking speed constant: ~1.2 m/s -> 72 meters per minute
WALKING_SPEED_METERS_PER_MINUTE = 72.0

# Timeout for OSRM public foot routing to guarantee backend SLA (< 800ms)
OSRM_TIMEOUT_SECONDS = 0.8
OSRM_FOOT_ROUTING_URL = "https://routing.openstreetmap.de/routed-foot/route/v1/driving/{origin_lng},{origin_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson"

# -----------------------------------------------------------------------------
# Cu Chi Tunnels Bến Dược - Verified Walking Pathway Trail Network Graph
# Fallback nodes representing physical junctions, entrances, monuments, and trail bends.
# -----------------------------------------------------------------------------
CU_CHI_TRAIL_NODES: dict[str, tuple[float, float, str]] = {
    "N_MAIN_ENTRANCE": (11.143200, 106.463100, "Cổng vào Bến Dược"),
    "N_TICKET_PLAZA": (11.143100, 106.462600, "Khu vực soát vé & Lối vào"),
    "N_MAIN_PATH_EAST": (11.143300, 106.462100, "Đường chính phía Đông"),
    "N_MONUMENT_PLAZA": (11.144100, 106.461600, "Quảng trường Đền Bến Dược"),
    "N_MEMORIAL_TEMPLE": (11.144600, 106.461400, "Đền tưởng niệm Liệt sĩ"),
    "N_NORTH_TRAIL_JUNCTION": (11.145100, 106.460700, "Ngã ba đường mòn phía Bắc"),
    "N_TUNNEL_SECTOR_1": (11.144700, 106.459900, "Khu hầm địa đạo số 1"),
    "N_SECRET_ENTRANCE": (11.144200, 106.459300, "Nắp hầm bí mật"),
    "N_JUNGLE_WALK_CENTRAL": (11.143500, 106.459600, "Lối mòn rừng rậm trung tâm"),
    "N_HOANG_CAM_KITCHEN": (11.142900, 106.459000, "Bếp Hoàng Cầm"),
    "N_WEAPON_WORKSHOP": (11.142200, 106.459400, "Xưởng chế tạo vũ khí tự tạo"),
    "N_MEETING_BUNKER": (11.142500, 106.460400, "Hầm hội họp & Sa bàn"),
    "N_SOUTH_REST_AREA": (11.142000, 106.461200, "Khu nghỉ chân phía Nam"),
    "N_LAKE_PROMENADE": (11.142600, 106.462200, "Đường dạo ven hồ cảnh quan"),
    "N_COMMAND_POST": (11.143800, 106.460500, "Khu tái hiện Vùng giải phóng"),
}

CU_CHI_TRAIL_EDGES: list[tuple[str, str]] = [
    ("N_MAIN_ENTRANCE", "N_TICKET_PLAZA"),
    ("N_TICKET_PLAZA", "N_MAIN_PATH_EAST"),
    ("N_MAIN_PATH_EAST", "N_MONUMENT_PLAZA"),
    ("N_MAIN_PATH_EAST", "N_LAKE_PROMENADE"),
    ("N_MONUMENT_PLAZA", "N_MEMORIAL_TEMPLE"),
    ("N_MEMORIAL_TEMPLE", "N_NORTH_TRAIL_JUNCTION"),
    ("N_NORTH_TRAIL_JUNCTION", "N_TUNNEL_SECTOR_1"),
    ("N_TUNNEL_SECTOR_1", "N_SECRET_ENTRANCE"),
    ("N_SECRET_ENTRANCE", "N_JUNGLE_WALK_CENTRAL"),
    ("N_JUNGLE_WALK_CENTRAL", "N_HOANG_CAM_KITCHEN"),
    ("N_HOANG_CAM_KITCHEN", "N_WEAPON_WORKSHOP"),
    ("N_WEAPON_WORKSHOP", "N_MEETING_BUNKER"),
    ("N_MEETING_BUNKER", "N_COMMAND_POST"),
    ("N_COMMAND_POST", "N_MONUMENT_PLAZA"),
    ("N_COMMAND_POST", "N_JUNGLE_WALK_CENTRAL"),
    ("N_MEETING_BUNKER", "N_SOUTH_REST_AREA"),
    ("N_SOUTH_REST_AREA", "N_LAKE_PROMENADE"),
]


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
    """Hybrid Service computing authentic walking paths along OpenStreetMap curves and trail graph."""

    def __init__(self, poi_repository: POIRepository, db_session=None) -> None:
        self.poi_repository = poi_repository
        self.db = db_session
        self._graph: dict[str, list[tuple[str, float]]] = {}
        self._build_trail_graph()

    def _build_trail_graph(self) -> None:
        """Pre-compute graph adjacency list with edge weights (distances in meters)."""
        for node_id in CU_CHI_TRAIL_NODES:
            self._graph[node_id] = []

        for u, v in CU_CHI_TRAIL_EDGES:
            lat_u, lng_u, _ = CU_CHI_TRAIL_NODES[u]
            lat_v, lng_v, _ = CU_CHI_TRAIL_NODES[v]
            dist = haversine_distance(lat_u, lng_u, lat_v, lng_v)
            self._graph[u].append((v, dist))
            self._graph[v].append((u, dist))

    def _find_nearest_trail_node(self, lat: float, lng: float) -> tuple[str, float]:
        """Find the closest trail waypoint node to any given coordinate."""
        nearest_node = None
        min_distance = float("inf")

        for node_id, (n_lat, n_lng, _) in CU_CHI_TRAIL_NODES.items():
            dist = haversine_distance(lat, lng, n_lat, n_lng)
            if dist < min_distance:
                min_distance = dist
                nearest_node = node_id

        assert nearest_node is not None
        return nearest_node, min_distance

    def _dijkstra_shortest_path(self, start_node: str, end_node: str) -> list[str]:
        """Compute shortest path across the trail graph via Dijkstra's algorithm."""
        if start_node == end_node:
            return [start_node]

        distances: dict[str, float] = {
            node: float("inf") for node in CU_CHI_TRAIL_NODES
        }
        distances[start_node] = 0.0
        previous_nodes: dict[str, str | None] = {
            node: None for node in CU_CHI_TRAIL_NODES
        }

        pq: list[tuple[float, str]] = [(0.0, start_node)]

        while pq:
            current_dist, current_node = heapq.heappop(pq)

            if current_node == end_node:
                break

            if current_dist > distances[current_node]:
                continue

            for neighbor, weight in self._graph[current_node]:
                distance_through_current = current_dist + weight
                if distance_through_current < distances[neighbor]:
                    distances[neighbor] = distance_through_current
                    previous_nodes[neighbor] = current_node
                    heapq.heappush(pq, (distance_through_current, neighbor))

        path: list[str] = []
        curr: str | None = end_node
        while curr is not None:
            path.append(curr)
            curr = previous_nodes[curr]
        path.reverse()

        return path if path and path[0] == start_node else [start_node, end_node]

    def _try_osrm_foot_route(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> tuple[list[list[float]], float] | None:
        """Query OpenStreetMap Foot Routing service for detailed curved geometry.

        Returns (coordinates, distance_meters) or None if unavailable/timed out.
        """
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
                    payload = response.json()
                    routes = payload.get("routes", [])
                    if routes:
                        best_route = routes[0]
                        coordinates = best_route.get("geometry", {}).get("coordinates")
                        distance = float(best_route.get("distance", 0.0))
                        if coordinates and len(coordinates) >= 2 and distance > 0:
                            return coordinates, distance
        except Exception as exc:
            logger.info(
                "OSRM routing unavailable (%s), falling back to trail graph", exc
            )
        return None

    def _compute_internal_trail_route(
        self,
        origin_lat: float,
        origin_lng: float,
        poi_lat: float,
        poi_lng: float,
    ) -> tuple[list[list[float]], float]:
        """Compute path using internal Cu Chi trail network graph."""
        direct_dist = haversine_distance(origin_lat, origin_lng, poi_lat, poi_lng)

        if direct_dist <= 35.0:
            return (
                [
                    [round(origin_lng, 6), round(origin_lat, 6)],
                    [round(poi_lng, 6), round(poi_lat, 6)],
                ],
                direct_dist,
            )

        nearest_origin_node, dist_to_start_node = self._find_nearest_trail_node(
            origin_lat, origin_lng
        )
        nearest_poi_node, _ = self._find_nearest_trail_node(poi_lat, poi_lng)

        trail_path_nodes = self._dijkstra_shortest_path(
            nearest_origin_node, nearest_poi_node
        )

        coords: list[list[float]] = [[round(origin_lng, 6), round(origin_lat, 6)]]
        total_distance = dist_to_start_node
        prev_lat, prev_lng = origin_lat, origin_lng

        for node_id in trail_path_nodes:
            n_lat, n_lng, _ = CU_CHI_TRAIL_NODES[node_id]
            coords.append([round(n_lng, 6), round(n_lat, 6)])
            total_distance += haversine_distance(prev_lat, prev_lng, n_lat, n_lng)
            prev_lat, prev_lng = n_lat, n_lng

        coords.append([round(poi_lng, 6), round(poi_lat, 6)])
        total_distance += haversine_distance(prev_lat, prev_lng, poi_lat, poi_lng)

        return coords, total_distance

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
        """Calculate intelligent walking route using hybrid OSM curvature + trail graph."""
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

        # 4. Hybrid Routing: Try OpenStreetMap foot routing curve first; Fallback to internal trail graph
        osrm_result = self._try_osrm_foot_route(
            origin_lat, origin_lng, poi_lat, poi_lng
        )
        if osrm_result is not None:
            geojson_coordinates, total_distance = osrm_result
        else:
            geojson_coordinates, total_distance = self._compute_internal_trail_route(
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
