"""Administrative POI API routes (US 03.2 - geofence calibration).

Presentation boundary only: it validates the payload through Pydantic,
resolves the authenticated Administrator and delegates every business rule to
`POIService`. It never imports repositories or models (dev_rules Section 3.2).
"""

from fastapi import APIRouter, BackgroundTasks, Depends, File, Request, UploadFile

from app.controllers.auth_controller import resolve_client_ip
from app.core.dependencies import get_current_admin_profile
from app.schemas.auth_schema import AdminProfileResponse
from app.schemas.poi_schema import (
    POIResponse,
    POIUpdateRequest,
    POIUpdateResponse,
    POIVisibilityUpdateRequest,
)
from app.services.poi_service import POIService, get_poi_service

ADMIN_POI_ROUTE_PREFIX = "/api/v1/admin/pois"


router = APIRouter(
    prefix=ADMIN_POI_ROUTE_PREFIX,
    tags=["Administrator POI Management"],
)


@router.put("/{poi_id}", response_model=POIUpdateResponse)
def update_poi(
    poi_id: str,
    payload: POIUpdateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    service: POIService = Depends(get_poi_service),
    current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> POIUpdateResponse:
    """Update an exhibit's geofence: coordinates and/or trigger radius."""
    poi = service.update_poi(
        poi_id,
        payload,
        admin_user_name=current_admin.user_name,
        client_ip=resolve_client_ip(request),
        background_tasks=background_tasks,
    )

    return POIUpdateResponse(data=poi)


@router.post("/upload-image")
async def upload_poi_image(
    file: UploadFile = File(...),
    service: POIService = Depends(get_poi_service),
    current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> dict:
    """Upload an exhibit cover image file and return its static URL."""
    image_url = await service.save_cover_image(file)

    return {"image_url": image_url}


@router.patch("/{poi_id}/visibility", response_model=POIResponse)
def set_poi_visibility(
    poi_id: str,
    payload: POIVisibilityUpdateRequest,
    request: Request,
    service: POIService = Depends(get_poi_service),
    current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> POIResponse:
    """Toggle an exhibit's active visibility state (US 03.3)."""

    return service.set_poi_visibility(
        poi_id=poi_id,
        is_active=payload.is_active,
        admin_user_name=current_admin.user_name,
        client_ip=resolve_client_ip(request),
    )
