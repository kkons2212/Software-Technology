"""Public language API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.poi_schema import APIResponse, PublishedLanguage
from app.services.language_service import LanguageService, get_language_service

router = APIRouter(prefix="/api/v1/languages", tags=["visitor"])


@router.get("", response_model=APIResponse[list[PublishedLanguage]])
def get_published_languages(
    service: Annotated[LanguageService, Depends(get_language_service)],
) -> APIResponse[list[PublishedLanguage]]:
    languages = service.list_published()
    return APIResponse(data=languages)
