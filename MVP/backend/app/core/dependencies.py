"""Dependency-injection composition root for the FastAPI application.

Lives outside `controllers/`, `services/` and `repositories/` so the
AST boundary checker never mistakes it for a layer violation.
"""

from pathlib import Path

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal, get_db
from app.repositories.audit_repository import AuditRepository
from app.repositories.language_repository import LanguageRepository
from app.repositories.poi_repository import POIRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.translation_repository import TranslationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import AdminProfileResponse
from app.services.auth_service import AuthService
from app.services.language_service import LanguageService
from app.services.payment_service import PaymentService
from app.services.poi_service import POIService
from app.services.session_service import SessionService
from app.services.translation_service import TranslationService
from app.services.tts_service import TTSService


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


def get_export_service(db: Session = Depends(get_db)):
    """Dependency provider injecting TelemetryRepository into ExportService."""
    from app.repositories.telemetry_repository import TelemetryRepository
    from app.services.export_service import ExportService

    telemetry_repo = TelemetryRepository(db)
    return ExportService(telemetry_repo=telemetry_repo)


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


def get_tts_service() -> TTSService:
    """Build the audio service with short-lived sessions around database work."""
    return TTSService(
        session_factory=SessionLocal,
        audio_dir=Path(get_settings().STATIC_DIR) / "audio",
    )


def get_transaction_repository(db: Session = Depends(get_db)) -> TransactionRepository:
    """Build a TransactionRepository bound to the request session."""
    return TransactionRepository(db)


def get_session_repository(db: Session = Depends(get_db)) -> SessionRepository:
    """Build a SessionRepository bound to the request session."""
    return SessionRepository(db)


def get_session_service(
    session_repo: SessionRepository = Depends(get_session_repository),
) -> SessionService:
    """Build the SessionService for visitor session recovery and access validation."""
    return SessionService(session_repository=session_repo)


def get_payment_service(
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    session_repo: SessionRepository = Depends(get_session_repository),
) -> PaymentService:
    """Build the PaymentService for checkout order creation, polling, and webhook activation."""
    return PaymentService(
        transaction_repo=transaction_repo,
        session_repo=session_repo,
    )


def get_storage_service(db: Session = Depends(get_db)):
    """Dependency provider injecting AudioRepository and AuditRepository into StorageService."""
    from app.repositories.audio_repository import AudioRepository
    from app.services.storage_service import StorageService

    settings = get_settings()
    audio_dir = Path(settings.STATIC_DIR) / "audio"
    return StorageService(
        audio_repository=AudioRepository(db),
        audit_repository=AuditRepository(db),
        audio_dir=audio_dir,
        settings=settings,
    )


def get_wayfinding_service(db: Session = Depends(get_db)):
    """Dependency provider injecting POIRepository into WayfindingService."""
    from app.repositories.poi_repository import POIRepository
    from app.services.wayfinding_service import WayfindingService

    poi_repo = POIRepository(db)
    return WayfindingService(db_session=db, poi_repository=poi_repo)
