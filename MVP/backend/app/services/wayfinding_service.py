"""Wayfinding Service (US 01.4 - TSK-01.4.1).

Computes optimal walking routes and waypoints connecting the visitor's live GPS
coordinates with target exhibits within the Cu Chi Tunnels Historical Site perimeter.
Produces GeoJSON LineString payloads compliant with RFC 7946 with calculation latency < 500ms.
"""

from __future__ import annotations

import heapq
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
    from sqlalchemy.orm import Session

    from app.repositories.poi_repository import POIRepository

# Walking speed constant: ~1.2 m/s -> 72 meters per minute
WALKING_SPEED_METERS_PER_MINUTE = 72.0

# -----------------------------------------------------------------------------
# Cu Chi Tunnels Bến Dược - Verified Walking Pathway Trail Network Graph
# Nodes represent physical junctions, entrances, monuments, and trail crossings.
# All nodes are strictly within CU_CHI_BOUNDS.
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
    "N_EXHIBIT_HALL": (11.142400, 106.462000, "Nhà truyền thống & Hiện vật"),
    "N_SHOOTING_RANGE_GATE": (11.141600, 106.462700, "Đường vào trường bắn thể thao"),
}

# Bidirectional edges representing cleared walkable footpaths between nodes
CU_CHI_TRAIL_EDGES: list[tuple[str, str]] = [
    ("N_MAIN_ENTRANCE", "N_TICKET_PLAZA"),
    ("N_TICKET_PLAZA", "N_MAIN_PATH_EAST"),
    ("N_MAIN_PATH_EAST", "N_MONUMENT_PLAZA"),
    ("N_MAIN_PATH_EAST", "N_EXHIBIT_HALL"),
    ("N_MONUMENT_PLAZA", "N_MEMORIAL_TEMPLE"),
    ("N_MONUMENT_PLAZA", "N_NORTH_TRAIL_JUNCTION"),
    ("N_NORTH_TRAIL_JUNCTION", "N_TUNNEL_SECTOR_1"),
    ("N_TUNNEL_SECTOR_1", "N_SECRET_ENTRANCE"),
    ("N_SECRET_ENTRANCE", "N_JUNGLE_WALK_CENTRAL"),
    ("N_MONUMENT_PLAZA", "N_JUNGLE_WALK_CENTRAL"),
    ("N_JUNGLE_WALK_CENTRAL", "N_HOANG_CAM_KITCHEN"),
    ("N_HOANG_CAM_KITCHEN", "N_WEAPON_WORKSHOP"),
    ("N_WEAPON_WORKSHOP", "N_MEETING_BUNKER"),
    ("N_MEETING_BUNKER", "N_SOUTH_REST_AREA"),
    ("N_SOUTH_REST_AREA", "N_EXHIBIT_HALL"),
    ("N_SOUTH_REST_AREA", "N_SHOOTING_RANGE_GATE"),
    ("N_EXHIBIT_HALL", "N_TICKET_PLAZA"),
]


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two GPS coordinates in meters."""
    earth_radius_m = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (
        math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_m * c


def _is_within_cu_chi_bounds(latitude: float, longitude: float) -> bool:
    """Verify coordinate resides within permitted museum geographic bounds."""
    bounds = settings.CU_CHI_BOUNDS
    return (
        bounds["min_lat"] <= latitude <= bounds["max_lat"]
        and bounds["min_lng"] <= longitude <= bounds["max_lng"]
    )


class WayfindingService:
    """Service responsible for calculating intelligent walking routes across the museum grounds."""

    def __init__(
        self,
        db_session: Session | None = None,
        poi_repository: POIRepository | None = None,
    ) -> None:
        self.db = db_session
        self._poi_repository = poi_repository
        self._adjacency_list: dict[str, list[tuple[str, float]]] = {}
        self._build_trail_graph()

    @property
    def poi_repository(self) -> POIRepository:
        """Lazy load POIRepository if not directly injected."""
        if self._poi_repository is None:
            from app.repositories.poi_repository import POIRepository

            self._poi_repository = POIRepository(self.db)
        return self._poi_repository

    def _build_trail_graph(self) -> None:
        """Construct the adjacency list for the historical trail network with edge weights in meters."""
        for node_id in CU_CHI_TRAIL_NODES:
            self._adjacency_list[node_id] = []

        for u, v in CU_CHI_TRAIL_EDGES:
            lat_u, lng_u, _ = CU_CHI_TRAIL_NODES[u]
            lat_v, lng_v, _ = CU_CHI_TRAIL_NODES[v]
            dist = haversine_distance(lat_u, lng_u, lat_v, lng_v)
            self._adjacency_list[u].append((v, dist))
            self._adjacency_list[v].append((u, dist))

    def _find_nearest_node(self, lat: float, lng: float) -> str:
        """Identify the closest node in the trail network to an arbitrary coordinate."""
        nearest_node = ""
        min_dist = float("inf")
        for node_id, (n_lat, n_lng, _) in CU_CHI_TRAIL_NODES.items():
            dist = haversine_distance(lat, lng, n_lat, n_lng)
            if dist < min_dist:
                min_dist = dist
                nearest_node = node_id
        return nearest_node

    def _dijkstra_shortest_path(self, start_node: str, target_node: str) -> list[str]:
        """Compute the shortest sequence of nodes connecting start and target nodes."""
        if start_node == target_node:
            return [start_node]

        distances: dict[str, float] = {
            node: float("inf") for node in CU_CHI_TRAIL_NODES
        }
        predecessors: dict[str, str | None] = {
            node: None for node in CU_CHI_TRAIL_NODES
        }
        distances[start_node] = 0.0

        # Priority queue item: (distance, node_id)
        queue: list[tuple[float, str]] = [(0.0, start_node)]

        while queue:
            current_dist, current_node = heapq.heappop(queue)

            if current_node == target_node:
                break

            if current_dist > distances[current_node]:
                continue

            for neighbor, weight in self._adjacency_list[current_node]:
                alt_distance = current_dist + weight
                if alt_distance < distances[neighbor]:
                    distances[neighbor] = alt_distance
                    predecessors[neighbor] = current_node
                    heapq.heappush(queue, (alt_distance, neighbor))

        # Reconstruct path
        path: list[str] = []
        curr: str | None = target_node
        while curr is not None:
            path.append(curr)
            curr = predecessors[curr]

        path.reverse()
        return path if path and path[0] == start_node else [start_node, target_node]

    def calculate_walking_route(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_poi_id: str,
    ) -> GeoJsonRouteFeature:
        """Compute optimal path waypoints connecting origin with target exhibit.

        DoD: Latency < 500ms, GeoJSON LineString payload with valid metadata.
        """
        # 1. Validate geographic perimeter
        if not _is_within_cu_chi_bounds(origin_lat, origin_lng):
            raise ApiError(
                status_code=422,
                code="COORDINATES_OUT_OF_BOUNDS",
                message="Origin coordinates are outside the Cu Chi Tunnels site perimeter.",
                details={
                    "latitude": origin_lat,
                    "longitude": origin_lng,
                    "bounds": settings.CU_CHI_BOUNDS,
                },
            )

        # 2. Look up destination POI and check active status (US 03.3 compliance)
        poi = self.poi_repository.get_by_id(destination_poi_id)
        if poi is None:
            raise ApiError(
                status_code=404,
                code="POI_NOT_FOUND",
                message=f"Destination exhibit '{destination_poi_id}' does not exist.",
            )

        if not poi.is_active:
            raise ApiError(
                status_code=404,
                code="POI_DEACTIVATED",
                message=f"Destination exhibit '{poi.title}' is currently deactivated.",
            )

        dest_lat = float(poi.latitude)
        dest_lng = float(poi.longitude)
        trigger_radius = (
            int(poi.trigger_radius) if poi.trigger_radius is not None else 30
        )

        # Direct distance check: if origin is already within or immediately adjacent to destination (< 30m)
        direct_dist = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        raw_waypoints: list[tuple[float, float]] = []

        if direct_dist <= 30.0:
            # Direct line of sight
            raw_waypoints = [(origin_lat, origin_lng), (dest_lat, dest_lng)]
        else:
            # Route through the museum trail network graph
            start_node = self._find_nearest_node(origin_lat, origin_lng)
            end_node = self._find_nearest_node(dest_lat, dest_lng)

            trail_path = self._dijkstra_shortest_path(start_node, end_node)

            # Assemble full path: origin -> trail path -> destination
            raw_waypoints.append((origin_lat, origin_lng))
            for node_id in trail_path:
                n_lat, n_lng, _ = CU_CHI_TRAIL_NODES[node_id]
                raw_waypoints.append((n_lat, n_lng))
            raw_waypoints.append((dest_lat, dest_lng))

        # Deduplicate consecutive identical points
        cleaned_waypoints: list[tuple[float, float]] = []
        for pt in raw_waypoints:
            if (
                not cleaned_waypoints
                or haversine_distance(
                    cleaned_waypoints[-1][0], cleaned_waypoints[-1][1], pt[0], pt[1]
                )
                > 0.5
            ):
                cleaned_waypoints.append(pt)

        # Compute cumulative distance
        total_distance = 0.0
        for i in range(len(cleaned_waypoints) - 1):
            total_distance += haversine_distance(
                cleaned_waypoints[i][0],
                cleaned_waypoints[i][1],
                cleaned_waypoints[i + 1][0],
                cleaned_waypoints[i + 1][1],
            )

        # Format coordinates for GeoJSON RFC 7946: [lng, lat]
        geojson_coordinates = [
            [round(lng, 6), round(lat, 6)] for lat, lng in cleaned_waypoints
        ]

        walking_minutes = max(
            0.5, round(total_distance / WALKING_SPEED_METERS_PER_MINUTE, 1)
        )

        return GeoJsonRouteFeature(
            type="Feature",
            geometry=GeoJsonLineStringGeometry(
                type="LineString",
                coordinates=geojson_coordinates,
            ),
            properties=RouteProperties(
                origin=RouteWaypoint(
                    lat=round(origin_lat, 6),
                    lng=round(origin_lng, 6),
                    name="Current Location",
                ),
                destination=RouteDestinationInfo(
                    poi_id=poi.poi_id,
                    title=poi.title,
                    lat=round(dest_lat, 6),
                    lng=round(dest_lng, 6),
                    trigger_radius=trigger_radius,
                ),
                total_distance_meters=round(total_distance, 1),
                estimated_walking_minutes=walking_minutes,
            ),
        )
