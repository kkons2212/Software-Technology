"""Public language API routes."""

from fastapi import APIRouter, Depends

from app.core.dependencies import get_language_service
from app.schemas.poi_schema import APIResponse, PublishedLanguage
from app.services.language_service import LanguageService

router = APIRouter(prefix="/api/v1/languages", tags=["Languages"])


@router.get("", response_model=APIResponse[list[PublishedLanguage]])
def get_published_languages(
    service: LanguageService = Depends(get_language_service),
) -> APIResponse[list[PublishedLanguage]]:
    languages = service.list_published()
    return APIResponse(data=languages)
