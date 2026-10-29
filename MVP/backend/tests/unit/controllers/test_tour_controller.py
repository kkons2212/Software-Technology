"""Unit test suite for TourController (US 01.4 - TSK-01.4.3).

Verifies HTTP routing, parameter validation, and standardized error envelopes
for GET /api/v1/tour/route.
"""

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.controllers.tour_controller import router as tour_router
from app.core.dependencies import get_wayfinding_service
from app.core.exceptions import ApiError, register_error_handlers
from app.schemas.tour_schema import (
    GeoJsonLineStringGeometry,
    GeoJsonRouteFeature,
    RouteDestinationInfo,
    RouteProperties,
    RouteWaypoint,
)

ROUTE_URL = "/api/v1/tour/route"


@pytest.fixture
def mock_wayfinding_service():
    return MagicMock()


@pytest.fixture
def client(mock_wayfinding_service):
    app = FastAPI()
    register_error_handlers(app)
    app.include_router(tour_router)
    app.dependency_overrides[get_wayfinding_service] = lambda: mock_wayfinding_service
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_route_feature():
    return GeoJsonRouteFeature(
        type="Feature",
        geometry=GeoJsonLineStringGeometry(
            type="LineString",
            coordinates=[
                [106.463100, 11.143200],
                [106.461400, 11.144500],
            ],
        ),
        properties=RouteProperties(
            origin=RouteWaypoint(
                lat=11.143200, lng=106.463100, name="Current Location"
            ),
            destination=RouteDestinationInfo(
                poi_id="POI_TEST_01",
                title="Địa đạo Bến Dược",
                lat=11.144500,
                lng=106.461400,
                trigger_radius=30,
            ),
            total_distance_meters=185.5,
            estimated_walking_minutes=2.6,
        ),
    )


def test_should_return_200_and_geojson_route(
    client, mock_wayfinding_service, sample_route_feature
):
    """GET /api/v1/tour/route returns 200 OK and GeoJSON Feature payload."""
    mock_wayfinding_service.calculate_walking_route.return_value = sample_route_feature

    response = client.get(
        ROUTE_URL,
        params={
            "origin_lat": 11.1432,
            "origin_lng": 106.4631,
            "destination_poi_id": "POI_TEST_01",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["type"] == "Feature"
    assert body["data"]["geometry"]["type"] == "LineString"
    assert len(body["data"]["geometry"]["coordinates"]) == 2
    assert body["data"]["properties"]["total_distance_meters"] == 185.5
    assert body["data"]["properties"]["destination"]["title"] == "Địa đạo Bến Dược"


def test_should_return_422_when_missing_required_params(client):
    """GET /api/v1/tour/route without required query parameters returns 422."""
    response = client.get(ROUTE_URL)
    assert response.status_code == 422


def test_should_return_404_when_poi_not_found(client, mock_wayfinding_service):
    """Returns standard 404 envelope when destination POI does not exist."""
    mock_wayfinding_service.calculate_walking_route.side_effect = ApiError(
        code="POI_NOT_FOUND",
        message="Exhibit 'nonexistent' not found.",
        status_code=404,
        details={"destination_poi_id": "nonexistent"},
    )

    response = client.get(
        ROUTE_URL,
        params={
            "origin_lat": 11.1432,
            "origin_lng": 106.4631,
            "destination_poi_id": "nonexistent",
        },
    )

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "POI_NOT_FOUND"


def test_should_return_404_when_poi_is_deactivated(client, mock_wayfinding_service):
    """Returns standard 404 envelope when target POI has been deactivated (US 03.3)."""
    mock_wayfinding_service.calculate_walking_route.side_effect = ApiError(
        code="POI_DEACTIVATED",
        message="Exhibit 'Hầm chỉ huy' has been deactivated and is not available for navigation.",
        status_code=404,
        details={"destination_poi_id": "POI_DEACTIVATED_01", "is_active": False},
    )

    response = client.get(
        ROUTE_URL,
        params={
            "origin_lat": 11.1432,
            "origin_lng": 106.4631,
            "destination_poi_id": "POI_DEACTIVATED_01",
        },
    )

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "POI_DEACTIVATED"
