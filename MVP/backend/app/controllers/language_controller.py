"""Language Controller: Returns supported and published languages (US 01.1)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.language import LanguageCode

router = APIRouter(prefix="/api/v1/languages", tags=["Languages"])


@router.get("", summary="Get published languages")
def list_languages(db: Session = Depends(get_db)):
    """Return all configured languages with published status for visitor app."""
    languages = db.query(LanguageCode).all()
    return [
        {
            "language_id": lang.LanguageID,
            "language_name": lang.LanguageName,
            "status": "PUBLISHED",
        }
        for lang in languages
    ]
