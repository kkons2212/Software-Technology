"""TourController: Handles walking route calculation and visitor wayfinding requests (US 01.4)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_wayfinding_service
from app.schemas.tour_schema import RouteResponse
from app.services.wayfinding_service import WayfindingService

router = APIRouter(prefix="/api/v1/tour", tags=["Tour Wayfinding"])


@router.get(
    "/route",
    response_model=RouteResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate intelligent walking route connecting visitor GPS to destination POI",
)
def get_walking_route(
    origin_lat: Annotated[float, Query(..., description="Visitor current latitude")],
    origin_lng: Annotated[float, Query(..., description="Visitor current longitude")],
    destination_poi_id: Annotated[str, Query(..., description="Target POI identifier")],
    wayfinding_service: Annotated[WayfindingService, Depends(get_wayfinding_service)],
) -> RouteResponse:
    """Compute optimal walking path waypoints and return RFC 7946 GeoJSON LineString."""
    feature = wayfinding_service.calculate_walking_route(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_poi_id=destination_poi_id,
    )
    return RouteResponse(success=True, data=feature)
