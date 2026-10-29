"""Unit test suite for WayfindingService (US 01.4 - TSK-01.4.3).

Verifies dynamic walking route calculation, GeoJSON LineString generation,
performance SLA (< 500ms), and error handling for out-of-bounds or deactivated POIs.
"""

import time
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import ApiError
from app.models.poi import POI
from app.services.wayfinding_service import (
    WayfindingService,
    haversine_distance,
)


@pytest.fixture
def mock_poi_repository():
    repo = MagicMock()
    return repo


@pytest.fixture
def active_poi():
    return POI(
        poi_id="POI_BEN_DUOC",
        title="Địa đạo Bến Dược",
        short_description="Hệ thống hầm địa đạo lịch sử Bến Dược",
        latitude=Decimal("11.144500"),
        longitude=Decimal("106.461400"),
        radius=30,
        is_active=True,
    )


@pytest.fixture
def deactivated_poi():
    return POI(
        poi_id="POI_CLOSED_BUNKER",
        title="Hầm đang bảo trì",
        short_description="Đang bảo trì đóng cửa",
        latitude=Decimal("11.142500"),
        longitude=Decimal("106.460400"),
        radius=25,
        is_active=False,
    )


def test_haversine_distance_calculation():
    """Verify haversine distance calculation accuracy against known coordinates."""
    # Distance between Main Entrance and Monument Plaza (~190m)
    dist = haversine_distance(11.1432, 106.4631, 11.1441, 106.4616)
    assert 160.0 < dist < 220.0
    # Zero distance between identical coordinates
    assert haversine_distance(11.1432, 106.4631, 11.1432, 106.4631) == 0.0


def test_should_calculate_dynamic_walking_route(mock_poi_repository, active_poi):
    """Calculates valid dynamic GeoJSON LineString connecting visitor GPS to POI."""
    mock_poi_repository.get_by_id.return_value = active_poi
    service = WayfindingService(poi_repository=mock_poi_repository)

    origin_lat, origin_lng = 11.1432, 106.4631
    result = service.calculate_walking_route(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_poi_id="POI_BEN_DUOC",
    )

    assert result.type == "Feature"
    assert result.geometry.type == "LineString"
    assert len(result.geometry.coordinates) >= 3

    # GeoJSON coordinates format is [lng, lat]
    first_coord = result.geometry.coordinates[0]
    last_coord = result.geometry.coordinates[-1]

    assert pytest.approx(first_coord[0], abs=0.001) == origin_lng
    assert pytest.approx(first_coord[1], abs=0.001) == origin_lat
    assert pytest.approx(last_coord[0], abs=0.001) == float(active_poi.longitude)
    assert pytest.approx(last_coord[1], abs=0.001) == float(active_poi.latitude)

    # Properties metadata
    assert result.properties.destination.poi_id == "POI_BEN_DUOC"
    assert result.properties.destination.title == "Địa đạo Bến Dược"
    assert result.properties.total_distance_meters > 50.0
    assert result.properties.estimated_walking_minutes > 0.0
    assert result.properties.origin.lat == origin_lat
    assert result.properties.origin.lng == origin_lng


def test_should_meet_calculation_latency_sla(
    mock_poi_repository, active_poi, monkeypatch
):
    """Validates calculation latency is strictly < 500ms (DoD requirement)."""
    mock_poi_repository.get_by_id.return_value = active_poi
    service = WayfindingService(poi_repository=mock_poi_repository)
    monkeypatch.setattr(service, "_try_osrm_foot_route", lambda *args, **kwargs: None)

    start_time = time.perf_counter()
    for _ in range(10):
        service.calculate_walking_route(
            origin_lat=11.1432,
            origin_lng=106.4631,
            destination_poi_id="POI_BEN_DUOC",
        )
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0 / 10.0

    assert elapsed_ms < 500.0  # Must be well below 500ms


def test_should_calculate_route_from_outside_museum(mock_poi_repository, active_poi):
    """Origin coordinate outside Cu Chi boundaries successfully routes into the exhibit."""
    mock_poi_repository.get_by_id.return_value = active_poi
    service = WayfindingService(poi_repository=mock_poi_repository)

    # Coordinates outside museum perimeter (e.g. approaching from highway or nearby city)
    origin_lat, origin_lng = 10.8231, 106.6297
    result = service.calculate_walking_route(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_poi_id="POI_BEN_DUOC",
    )
    assert result.type == "Feature"
    assert result.geometry.type == "LineString"
    assert len(result.geometry.coordinates) >= 2
    assert result.properties.destination.poi_id == "POI_BEN_DUOC"
    assert result.properties.origin.lat == origin_lat
    assert result.properties.origin.lng == origin_lng


def test_should_raise_422_when_origin_coordinates_invalid(
    mock_poi_repository, active_poi
):
    """Geographically invalid coordinates (< -90, > 90) raises ApiError 422."""
    mock_poi_repository.get_by_id.return_value = active_poi
    service = WayfindingService(poi_repository=mock_poi_repository)

    with pytest.raises(ApiError) as exc_info:
        service.calculate_walking_route(
            origin_lat=95.0,
            origin_lng=106.0,
            destination_poi_id="POI_BEN_DUOC",
        )
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail["code"] == "INVALID_COORDINATES"


def test_should_raise_404_when_poi_does_not_exist(mock_poi_repository):
    """Requesting route to nonexistent exhibit raises ApiError 404."""
    mock_poi_repository.get_by_id.return_value = None
    service = WayfindingService(poi_repository=mock_poi_repository)

    with pytest.raises(ApiError) as exc_info:
        service.calculate_walking_route(
            origin_lat=11.1432,
            origin_lng=106.4631,
            destination_poi_id="POI_NONEXISTENT",
        )
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "POI_NOT_FOUND"


def test_should_raise_404_when_poi_is_deactivated(mock_poi_repository, deactivated_poi):
    """Requesting route to deactivated exhibit (US 03.3) raises ApiError 404."""
    mock_poi_repository.get_by_id.return_value = deactivated_poi
    service = WayfindingService(poi_repository=mock_poi_repository)

    with pytest.raises(ApiError) as exc_info:
        service.calculate_walking_route(
            origin_lat=11.1432,
            origin_lng=106.4631,
            destination_poi_id="POI_CLOSED_BUNKER",
        )
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail["code"] == "POI_DEACTIVATED"


def test_should_use_osrm_foot_route_when_available(
    mock_poi_repository, active_poi, monkeypatch
):
    """When OSRM foot routing succeeds, returns curved OSM geometry directly."""
    mock_poi_repository.get_by_id.return_value = active_poi
    service = WayfindingService(poi_repository=mock_poi_repository)

    # Mock OSRM result returning a 4-point curved polyline
    mock_curved_coords = [
        [106.4631, 11.1432],
        [106.4628, 11.1435],
        [106.4620, 11.1440],
        [106.4614, 11.1445],
    ]
    monkeypatch.setattr(
        service,
        "_try_osrm_foot_route",
        lambda *args, **kwargs: (mock_curved_coords, 210.0),
    )

    result = service.calculate_walking_route(
        origin_lat=11.1432,
        origin_lng=106.4631,
        destination_poi_id="POI_BEN_DUOC",
    )

    assert result.geometry.coordinates == mock_curved_coords
    assert result.properties.total_distance_meters == 210.0


def test_should_traverse_38_nodes_trail_graph_with_dijkstra(mock_poi_repository):
    """Verifies complete 38-node connectivity and Dijkstra pathfinding across distant waypoints."""
    service = WayfindingService(poi_repository=mock_poi_repository)
    assert len(service._graph) == 38

    # Path from TRAIL_NODE_01 (Entrance) to TRAIL_NODE_38 (Southernmost point)
    path = service._dijkstra_shortest_path("TRAIL_NODE_01", "TRAIL_NODE_38")
    assert len(path) >= 5
    assert path[0] == "TRAIL_NODE_01"
    assert path[-1] == "TRAIL_NODE_38"
