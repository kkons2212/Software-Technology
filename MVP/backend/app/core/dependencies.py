"""Dependency-injection composition root for the FastAPI application.

US 02.1. Lives outside `controllers/`, `services/` and `repositories/` so the
AST boundary checker never mistakes it for a layer violation.
"""

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import AdminProfileResponse
from app.services.auth_service import AuthService


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
