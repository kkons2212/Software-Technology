"""Language Controller: Returns supported and published languages (US 01.1)."""

from fastapi import APIRouter, Depends

from app.core.dependencies import get_language_service
from app.services.language_service import LanguageService

router = APIRouter(prefix="/api/v1/languages", tags=["Languages"])


@router.get("", summary="Get published languages")
def list_languages(
    language_service: LanguageService = Depends(get_language_service),
):
    """Return all configured languages with published status for visitor app."""
    return language_service.get_published_languages()
