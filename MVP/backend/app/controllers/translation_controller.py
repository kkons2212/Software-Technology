"""Admin Translation Audit Controller (US 04.1).

Enables side-by-side historical audit and terminology refinement for multilingual POI guides.
"""

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.dependencies import get_current_admin, get_translation_service
from app.schemas.translation_schema import (
    TranslationListResponse,
    TranslationResponse,
    TranslationUpdateRequest,
)
from app.services.translation_service import TranslationService

router = APIRouter(prefix="/api/v1/admin/translations", tags=["Translation Audit"])


@router.get("", response_model=TranslationListResponse, status_code=status.HTTP_200_OK)
def list_translations(
    poi_id: str | None = Query(None, description="Filter by POI identifier"),
    language_id: str | None = Query(None, description="Filter by target language code"),
    status_filter: str | None = Query(
        None,
        alias="status",
        description="Filter by status (DRAFT, NEEDS_UPDATE, PUBLISHED, PENDING)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Items per page"),
    translation_service: TranslationService = Depends(get_translation_service),
    current_admin: str = Depends(get_current_admin),
) -> TranslationListResponse:
    """Retrieve paginated translations with source comparison metadata and query filters."""
    skip = (page - 1) * size
    return translation_service.list_translations(
        poi_id=poi_id,
        language_id=language_id,
        status_filter=status_filter,
        skip=skip,
        limit=size,
    )


@router.get("/{id}", response_model=TranslationResponse, status_code=status.HTTP_200_OK)
def get_translation_by_id(
    id: str,
    translation_service: TranslationService = Depends(get_translation_service),
    current_admin: str = Depends(get_current_admin),
) -> TranslationResponse:
    """Fetch single translation audit record by identifier."""
    return translation_service.get_translation_by_id(stran_id=id)


@router.put("/{id}", response_model=TranslationResponse, status_code=status.HTTP_200_OK)
def update_translation(
    id: str,
    payload: TranslationUpdateRequest,
    request: Request,
    translation_service: TranslationService = Depends(get_translation_service),
    current_admin: str = Depends(get_current_admin),
) -> TranslationResponse:
    """Update translation text and transition status to NEEDS_UPDATE (AC-04.1.3 & Rule 5.1)."""
    client_ip = request.client.host if request.client else None
    return translation_service.update_translation(
        stran_id=id,
        payload=payload,
        admin_username=current_admin,
        ip_address=client_ip,
    )
