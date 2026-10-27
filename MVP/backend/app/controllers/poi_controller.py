"""Public POI API routes."""

from fastapi import APIRouter, Depends, Query

from app.schemas.poi_schema import APIResponse, POIMapItem
from app.services.poi_service import POIService, get_poi_service

router = APIRouter(prefix="/api/v1/pois", tags=["visitor"])


@router.get("", response_model=APIResponse[list[POIMapItem]])
def get_map_pois(
    language: str | None = Query(default=None, min_length=1, max_length=20),
    service: POIService = Depends(get_poi_service),
) -> APIResponse[list[POIMapItem]]:
    pois = service.list_map_pois(language)
    return APIResponse(data=pois)
