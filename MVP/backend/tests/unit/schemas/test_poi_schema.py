"""Paired unit tests for `app.schemas.poi_schema` (US 03.2 write contracts).

Covers the shared partial `POIUpdateRequest` used by the geofence calibration
screen and, later, the full exhibit editor, plus the response envelope.
"""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.poi import POI
from app.schemas.poi_schema import (
    DEFAULT_TRIGGER_RADIUS,
    MAX_TRIGGER_RADIUS,
    MIN_TRIGGER_RADIUS,
    POIMapItem,
    POIUpdateRequest,
    POIUpdateResponse,
)

VALID_LATITUDE = 11.1445
VALID_LONGITUDE = 106.4645
VALID_RADIUS = DEFAULT_TRIGGER_RADIUS


def _build_poi_model() -> POI:
    return POI(
        poi_id="poi-1",
        title="Tunnel entrance",
        short_description="A narrow entry",
        image_url="https://example.test/poi.jpg",
        latitude=Decimal("11.1445000"),
        longitude=Decimal("106.4645000"),
        radius=VALID_RADIUS,
        is_active=True,
    )


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_accept_a_radius_only_partial_update():
    update_request = POIUpdateRequest(radius=45)

    assert update_request.radius == 45
    # The untouched axes stay unset so the service can keep the stored values.
    assert update_request.latitude is None
    assert update_request.longitude is None


def test_should_accept_a_coordinate_only_partial_update():
    update_request = POIUpdateRequest(
        latitude=VALID_LATITUDE, longitude=VALID_LONGITUDE
    )

    assert update_request.latitude == VALID_LATITUDE
    assert update_request.longitude == VALID_LONGITUDE
    assert update_request.radius is None


def test_should_build_map_item_from_orm_entity():
    item = POIMapItem.model_validate(_build_poi_model())

    assert item.id == "poi-1"
    assert item.title == "Tunnel entrance"
    assert item.latitude == 11.1445
    assert item.longitude == 106.4645
    assert item.trigger_radius == VALID_RADIUS


def test_should_default_update_envelope_success_flag_to_true():
    item = POIMapItem.model_validate(_build_poi_model())

    response = POIUpdateResponse(data=item)

    assert response.success is True
    assert response.model_dump()["success"] is True
    assert response.data.id == "poi-1"


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_accept_radius_at_both_ends_of_the_slider_range():
    assert POIUpdateRequest(radius=MIN_TRIGGER_RADIUS).radius == MIN_TRIGGER_RADIUS
    assert POIUpdateRequest(radius=MAX_TRIGGER_RADIUS).radius == MAX_TRIGGER_RADIUS


def test_should_accept_geographic_extremes_within_pydantic_limits():
    update_request = POIUpdateRequest(latitude=-90.0, longitude=180.0)

    assert update_request.latitude == -90.0
    assert update_request.longitude == 180.0


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_reject_an_empty_payload():
    # The shared endpoint needs at least one field to know what to change.
    with pytest.raises(ValidationError):
        POIUpdateRequest()


@pytest.mark.parametrize("radius", [MIN_TRIGGER_RADIUS - 1, MAX_TRIGGER_RADIUS + 1])
def test_should_reject_radius_outside_the_slider_range(radius):
    with pytest.raises(ValidationError):
        POIUpdateRequest(radius=radius)


@pytest.mark.parametrize("latitude", [-90.1, 90.1])
def test_should_reject_latitude_beyond_pydantic_limits(latitude):
    with pytest.raises(ValidationError):
        POIUpdateRequest(latitude=latitude)


@pytest.mark.parametrize("longitude", [-180.1, 180.1])
def test_should_reject_longitude_beyond_pydantic_limits(longitude):
    with pytest.raises(ValidationError):
        POIUpdateRequest(longitude=longitude)
