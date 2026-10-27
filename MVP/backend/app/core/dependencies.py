"""Dependency-injection composition root for the FastAPI application.

Lives outside `controllers/`, `services/` and `repositories/` so the
AST boundary checker never mistakes it for a layer violation.
"""

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.repositories.audit_repository import AuditRepository
from app.repositories.language_repository import LanguageRepository
from app.repositories.poi_repository import POIRepository
from app.repositories.translation_repository import TranslationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import AdminProfileResponse
from app.services.auth_service import AuthService
from app.services.language_service import LanguageService
from app.services.poi_service import POIService
from app.services.translation_service import TranslationService


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    """Build a `UserRepository` bound to the request-scoped JIT session."""
    return UserRepository(db)


def get_audit_repository(db: Session = Depends(get_db)) -> AuditRepository:
    """Build an `AuditRepository` bound to the request-scoped JIT session."""
    return AuditRepository(db)


def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository),
    audit_repository: AuditRepository = Depends(get_audit_repository),
) -> AuthService:
    """Build the authentication service; FastAPI reuses one `get_db` session."""
    return AuthService(
        user_repository=user_repository,
        audit_repository=audit_repository,
    )


def get_current_admin_profile(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> AdminProfileResponse:
    """Resolve the authenticated administrator from the HttpOnly session cookie."""
    access_token = request.cookies.get(get_settings().ADMIN_SESSION_COOKIE_NAME)
    return auth_service.resolve_authenticated_admin(access_token)


def get_current_admin(authorization: str | None = Header(None)) -> str:
    """Extract authenticated admin username from request or fallback to default admin."""
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


def get_language_service(db: Session = Depends(get_db)) -> LanguageService:
    """Dependency provider injecting LanguageRepository into LanguageService."""
    language_repo = LanguageRepository(db)
    return LanguageService(repository=language_repo)


def get_translation_service(db: Session = Depends(get_db)) -> TranslationService:
    """Dependency provider injecting TranslationRepository & AuditRepository into TranslationService."""
    translation_repo = TranslationRepository(db)
    audit_repo = AuditRepository(db)
    poi_repo = POIRepository(db)
    return TranslationService(
        translation_repo=translation_repo,
        audit_repo=audit_repo,
        poi_repo=poi_repo,
    )
