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
    "TRAIL_NODE_01": (11.142983, 106.462924, "Trail Waypoint 01"),
    "TRAIL_NODE_02": (11.142554, 106.463255, "Trail Waypoint 02"),
    "TRAIL_NODE_03": (11.142524, 106.463966, "Trail Waypoint 03"),
    "TRAIL_NODE_04": (11.143270, 106.463757, "Trail Waypoint 04"),
    "TRAIL_NODE_05": (11.142736, 106.464217, "Trail Waypoint 05"),
    "TRAIL_NODE_06": (11.142914, 106.464837, "Trail Waypoint 06"),
    "TRAIL_NODE_07": (11.143871, 106.463193, "Trail Waypoint 07"),
    "TRAIL_NODE_08": (11.144544, 106.462910, "Trail Waypoint 08"),
    "TRAIL_NODE_09": (11.143058, 106.464190, "Trail Waypoint 09"),
    "TRAIL_NODE_10": (11.142864, 106.464801, "Trail Waypoint 10"),
    "TRAIL_NODE_11": (11.143664, 106.464050, "Trail Waypoint 11"),
    "TRAIL_NODE_12": (11.144290, 106.464490, "Trail Waypoint 12"),
    "TRAIL_NODE_13": (11.144685, 106.464013, "Trail Waypoint 13"),
    "TRAIL_NODE_14": (11.144895, 106.463476, "Trail Waypoint 14"),
    "TRAIL_NODE_15": (11.144195, 106.463519, "Trail Waypoint 15"),
    "TRAIL_NODE_16": (11.145302, 106.460620, "Trail Waypoint 16"),
    "TRAIL_NODE_17": (11.145037, 106.460358, "Trail Waypoint 17"),
    "TRAIL_NODE_18": (11.145178, 106.459240, "Trail Waypoint 18"),
    "TRAIL_NODE_19": (11.144541, 106.459420, "Trail Waypoint 19"),
    "TRAIL_NODE_20": (11.144205, 106.460015, "Trail Waypoint 20"),
    "TRAIL_NODE_21": (11.143674, 106.460512, "Trail Waypoint 21"),
    "TRAIL_NODE_22": (11.142408, 106.459267, "Trail Waypoint 22"),
    "TRAIL_NODE_23": (11.142496, 106.460349, "Trail Waypoint 23"),
    "TRAIL_NODE_24": (11.142673, 106.461035, "Trail Waypoint 24"),
    "TRAIL_NODE_25": (11.143620, 106.461360, "Trail Waypoint 25"),
    "TRAIL_NODE_26": (11.143613, 106.462006, "Trail Waypoint 26"),
    "TRAIL_NODE_27": (11.144224, 106.462499, "Trail Waypoint 27"),
    "TRAIL_NODE_28": (11.141839, 106.460645, "Trail Waypoint 28"),
    "TRAIL_NODE_29": (11.140862, 106.460738, "Trail Waypoint 29"),
    "TRAIL_NODE_30": (11.140570, 106.460350, "Trail Waypoint 30"),
    "TRAIL_NODE_31": (11.140273, 106.459153, "Trail Waypoint 31"),
    "TRAIL_NODE_32": (11.140699, 106.458665, "Trail Waypoint 32"),
    "TRAIL_NODE_33": (11.140605, 106.458107, "Trail Waypoint 33"),
    "TRAIL_NODE_34": (11.139131, 106.458080, "Trail Waypoint 34"),
    "TRAIL_NODE_35": (11.138689, 106.457281, "Trail Waypoint 35"),
    "TRAIL_NODE_36": (11.138541, 106.456562, "Trail Waypoint 36"),
    "TRAIL_NODE_37": (11.137530, 106.458186, "Trail Waypoint 37"),
    "TRAIL_NODE_38": (11.137056, 106.458615, "Trail Waypoint 38"),
}

CU_CHI_TRAIL_EDGES: list[tuple[str, str]] = [
    ("TRAIL_NODE_01", "TRAIL_NODE_02"),
    ("TRAIL_NODE_01", "TRAIL_NODE_04"),
    ("TRAIL_NODE_01", "TRAIL_NODE_07"),
    ("TRAIL_NODE_01", "TRAIL_NODE_26"),
    ("TRAIL_NODE_02", "TRAIL_NODE_03"),
    ("TRAIL_NODE_02", "TRAIL_NODE_04"),
    ("TRAIL_NODE_02", "TRAIL_NODE_05"),
    ("TRAIL_NODE_03", "TRAIL_NODE_04"),
    ("TRAIL_NODE_03", "TRAIL_NODE_05"),
    ("TRAIL_NODE_03", "TRAIL_NODE_06"),
    ("TRAIL_NODE_03", "TRAIL_NODE_09"),
    ("TRAIL_NODE_03", "TRAIL_NODE_10"),
    ("TRAIL_NODE_04", "TRAIL_NODE_05"),
    ("TRAIL_NODE_04", "TRAIL_NODE_07"),
    ("TRAIL_NODE_04", "TRAIL_NODE_09"),
    ("TRAIL_NODE_04", "TRAIL_NODE_11"),
    ("TRAIL_NODE_04", "TRAIL_NODE_15"),
    ("TRAIL_NODE_05", "TRAIL_NODE_06"),
    ("TRAIL_NODE_05", "TRAIL_NODE_09"),
    ("TRAIL_NODE_05", "TRAIL_NODE_10"),
    ("TRAIL_NODE_05", "TRAIL_NODE_11"),
    ("TRAIL_NODE_06", "TRAIL_NODE_09"),
    ("TRAIL_NODE_06", "TRAIL_NODE_10"),
    ("TRAIL_NODE_07", "TRAIL_NODE_08"),
    ("TRAIL_NODE_07", "TRAIL_NODE_11"),
    ("TRAIL_NODE_07", "TRAIL_NODE_15"),
    ("TRAIL_NODE_07", "TRAIL_NODE_27"),
    ("TRAIL_NODE_08", "TRAIL_NODE_14"),
    ("TRAIL_NODE_08", "TRAIL_NODE_15"),
    ("TRAIL_NODE_08", "TRAIL_NODE_27"),
    ("TRAIL_NODE_09", "TRAIL_NODE_10"),
    ("TRAIL_NODE_09", "TRAIL_NODE_11"),
    ("TRAIL_NODE_11", "TRAIL_NODE_12"),
    ("TRAIL_NODE_11", "TRAIL_NODE_13"),
    ("TRAIL_NODE_11", "TRAIL_NODE_15"),
    ("TRAIL_NODE_12", "TRAIL_NODE_13"),
    ("TRAIL_NODE_12", "TRAIL_NODE_15"),
    ("TRAIL_NODE_13", "TRAIL_NODE_14"),
    ("TRAIL_NODE_13", "TRAIL_NODE_15"),
    ("TRAIL_NODE_14", "TRAIL_NODE_15"),
    ("TRAIL_NODE_15", "TRAIL_NODE_27"),
    ("TRAIL_NODE_16", "TRAIL_NODE_17"),
    ("TRAIL_NODE_16", "TRAIL_NODE_20"),
    ("TRAIL_NODE_17", "TRAIL_NODE_18"),
    ("TRAIL_NODE_17", "TRAIL_NODE_20"),
    ("TRAIL_NODE_18", "TRAIL_NODE_19"),
    ("TRAIL_NODE_19", "TRAIL_NODE_20"),
    ("TRAIL_NODE_20", "TRAIL_NODE_21"),
    ("TRAIL_NODE_21", "TRAIL_NODE_25"),
    ("TRAIL_NODE_22", "TRAIL_NODE_23"),
    ("TRAIL_NODE_22", "TRAIL_NODE_28"),
    ("TRAIL_NODE_23", "TRAIL_NODE_24"),
    ("TRAIL_NODE_23", "TRAIL_NODE_28"),
    ("TRAIL_NODE_24", "TRAIL_NODE_25"),
    ("TRAIL_NODE_24", "TRAIL_NODE_28"),
    ("TRAIL_NODE_25", "TRAIL_NODE_26"),
    ("TRAIL_NODE_26", "TRAIL_NODE_27"),
    ("TRAIL_NODE_28", "TRAIL_NODE_29"),
    ("TRAIL_NODE_29", "TRAIL_NODE_30"),
    ("TRAIL_NODE_30", "TRAIL_NODE_31"),
    ("TRAIL_NODE_31", "TRAIL_NODE_32"),
    ("TRAIL_NODE_31", "TRAIL_NODE_33"),
    ("TRAIL_NODE_32", "TRAIL_NODE_33"),
    ("TRAIL_NODE_33", "TRAIL_NODE_34"),
    ("TRAIL_NODE_34", "TRAIL_NODE_35"),
    ("TRAIL_NODE_34", "TRAIL_NODE_36"),
    ("TRAIL_NODE_35", "TRAIL_NODE_36"),
    ("TRAIL_NODE_35", "TRAIL_NODE_37"),
    ("TRAIL_NODE_35", "TRAIL_NODE_38"),
    ("TRAIL_NODE_37", "TRAIL_NODE_38"),
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
