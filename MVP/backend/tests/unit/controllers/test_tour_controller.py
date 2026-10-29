"""Unit test suite for TourController (US 01.4 - TSK-01.4.3).

Verifies HTTP routing, parameter validation, and standardized error envelopes
for GET /api/v1/tour/route.
"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_wayfinding_service
from app.core.exceptions import ApiError
from app.main import app
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
                [106.462600, 11.143100],
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
    """GET /api/v1/tour/route with valid query params returns HTTP 200 and GeoJSON payload."""
    mock_wayfinding_service.calculate_walking_route.return_value = sample_route_feature

    response = client.get(
        ROUTE_URL,
        params={
            "origin_lat": 11.143200,
            "origin_lng": 106.463100,
            "destination_poi_id": "POI_TEST_01",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["type"] == "Feature"
    assert body["data"]["geometry"]["type"] == "LineString"
    assert len(body["data"]["geometry"]["coordinates"]) == 3
    assert body["data"]["properties"]["total_distance_meters"] == 185.5
    assert body["data"]["properties"]["destination"]["poi_id"] == "POI_TEST_01"


def test_should_return_422_when_missing_required_params(client):
    """GET /api/v1/tour/route without destination_poi_id returns HTTP 422 validation error."""
    response = client.get(
        ROUTE_URL,
        params={"origin_lat": 11.143200, "origin_lng": 106.463100},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "REQUEST_VALIDATION_ERROR"


def test_should_return_404_when_poi_not_found(client, mock_wayfinding_service):
    """GET /api/v1/tour/route returns HTTP 404 when POI does not exist."""
    mock_wayfinding_service.calculate_walking_route.side_effect = ApiError(
        status_code=404,
        code="POI_NOT_FOUND",
        message="Exhibit not found.",
    )

    response = client.get(
        ROUTE_URL,
        params={
            "origin_lat": 11.143200,
            "origin_lng": 106.463100,
            "destination_poi_id": "NONEXISTENT",
        },
    )

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "POI_NOT_FOUND"


def test_should_return_404_when_poi_is_deactivated(client, mock_wayfinding_service):
    """GET /api/v1/tour/route returns HTTP 404 when POI is deactivated (US 03.3)."""
    mock_wayfinding_service.calculate_walking_route.side_effect = ApiError(
        status_code=404,
        code="POI_DEACTIVATED",
        message="Exhibit is deactivated.",
    )

    response = client.get(
        ROUTE_URL,
        params={
            "origin_lat": 11.143200,
            "origin_lng": 106.463100,
            "destination_poi_id": "DEACTIVATED_POI",
        },
    )

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "POI_DEACTIVATED"
