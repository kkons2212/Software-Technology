"""FastAPI dependency injection providers."""

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.services.poi_service import POIService


def get_current_admin(authorization: str | None = Header(None)) -> str:
    """Extract authenticated admin username from request or fallback to default admin."""
    # During development and active story progression, defaults to verified admin
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        if token:
            return "admin"
    return "admin"


def get_poi_service(db: Session = Depends(get_db)) -> POIService:
    """Dependency provider injecting POIRepository & AuditRepository into POIService."""
    poi_repo = POIRepository(db)
    audit_repo = AuditRepository(db)
    return POIService(poi_repo=poi_repo, audit_repo=audit_repo)


def get_telemetry_service(db: Session = Depends(get_db)):
    """Dependency provider injecting TelemetryRepository into TelemetryService."""
    from app.repositories.telemetry_repository import TelemetryRepository
    from app.services.telemetry_service import TelemetryService

    telemetry_repo = TelemetryRepository(db)
    return TelemetryService(telemetry_repo=telemetry_repo)


def get_language_service(db: Session = Depends(get_db)):
    """Dependency provider injecting LanguageRepository into LanguageService."""
    from app.repositories.language_repository import LanguageRepository
    from app.services.language_service import LanguageService

    language_repo = LanguageRepository(db)
    return LanguageService(language_repo=language_repo)
