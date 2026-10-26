"""POIController Layer 1: Receives HTTP requests, validates input, and delegates to POIService."""

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Query,
    Request,
    status,
)

from app.core.dependencies import get_current_admin, get_poi_service
from app.schemas.poi_schema import POICreateRequest, POIListResponse, POIResponse
from app.services.poi_service import POIService

router = APIRouter(prefix="/admin/pois", tags=["POI Management"])


@router.post(
    "",
    response_model=POIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new exhibit POI profile with optional cover image upload",
)
async def create_poi(
    request: Request,
    background_tasks: BackgroundTasks,
    current_admin: str = Depends(get_current_admin),
    poi_service: POIService = Depends(get_poi_service),
) -> POIResponse:
    """Create a new POI profile. Supports both application/json and multipart/form-data."""
    client_ip = request.client.host if request.client else None
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        image = form.get("image")
        image_url = None
        if hasattr(image, "filename") and image.filename:
            image_url = await poi_service.save_cover_image(image)
        elif isinstance(image, str) and image:
            image_url = image

        payload = POICreateRequest(
            title=str(form.get("title", "")),
            short_description=form.get("short_description"),
            description=form.get("description"),
            latitude=float(form.get("latitude", 0.0)),
            longitude=float(form.get("longitude", 0.0)),
            radius=int(form.get("radius", 30)),
            image_url=image_url or form.get("image_url"),
        )
    else:
        body = await request.json()
        payload = POICreateRequest(**body)

    return await poi_service.create_new_poi(
        payload=payload,
        admin_username=current_admin,
        background_tasks=background_tasks,
        ip_address=client_ip,
    )


@router.get(
    "",
    response_model=POIListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all exhibits with pagination and search by title",
)
def list_pois(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Filter exhibits by title substring"),
    poi_service: POIService = Depends(get_poi_service),
    _: str = Depends(get_current_admin),
) -> POIListResponse:
    """Retrieve catalog exhibits with their foreign translation AI generation statuses."""
    return poi_service.list_pois(page=page, size=size, search=search)


@router.get(
    "/{poi_id}",
    response_model=POIResponse,
    status_code=status.HTTP_200_OK,
    summary="Get detailed exhibit profile by identifier",
)
def get_poi(
    poi_id: str,
    poi_service: POIService = Depends(get_poi_service),
    _: str = Depends(get_current_admin),
) -> POIResponse:
    """Fetch full exhibit profile including coordinates and all translation states."""
    return poi_service.get_poi_details(poi_id)
