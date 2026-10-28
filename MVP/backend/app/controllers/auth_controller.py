"""HTTP endpoints for Administrator authentication (US 02.1 & US 02.3).

Presentation boundary only: the controller validates the request through
Pydantic, delegates to `AuthService` and shapes the HTTP response. It never
imports repositories or models (dev_rules Section 3.2).
"""

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.config import get_settings
from app.core.dependencies import get_auth_service, get_current_admin_profile
from app.core.security import get_access_token_max_age_seconds
from app.schemas.auth_schema import (
    AdminLoginRequest,
    AdminLogoutDataResponse,
    AdminLogoutResponse,
    AdminProfileResponse,
    AdminSessionDataResponse,
    AdminSessionResponse,
)
from app.services.auth_service import AuthService

AUTH_ROUTE_PREFIX = "/api/v1/auth"
ADMIN_SESSION_COOKIE_PATH = "/"
X_FORWARDED_FOR_HEADER = "x-forwarded-for"

router = APIRouter(prefix=AUTH_ROUTE_PREFIX, tags=["Administrator Authentication"])


def resolve_client_ip(request: Request) -> str | None:
    """Resolve the originating client IP, honouring a single proxy hop."""
    forwarded_for = request.headers.get(X_FORWARDED_FOR_HEADER)
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return None


@router.post("/login", response_model=AdminSessionResponse)
def login_admin(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> AdminSessionResponse:
    """Authenticate an administrator and plant the HttpOnly session cookie."""
    session = auth_service.authenticate_admin(
        payload, client_ip=resolve_client_ip(request)
    )
    settings = get_settings()
    # HttpOnly + SameSite=Strict: the JWT is unreachable from JavaScript.
    response.set_cookie(
        key=settings.ADMIN_SESSION_COOKIE_NAME,
        value=session.access_token,
        max_age=get_access_token_max_age_seconds(),
        httponly=True,
        samesite="strict",
        secure=settings.IS_COOKIE_SECURE,
        path=ADMIN_SESSION_COOKIE_PATH,
    )
    return AdminSessionResponse(data=AdminSessionDataResponse(admin=session.admin))


@router.get("/me", response_model=AdminSessionResponse)
def read_current_admin(
    current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> AdminSessionResponse:
    """Return the profile of the administrator owning the current session."""
    return AdminSessionResponse(data=AdminSessionDataResponse(admin=current_admin))


@router.post(
    "/logout",
    response_model=AdminLogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin Logout",
)
def logout_admin(
    request: Request,
    response: Response,
    current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
    auth_service: AuthService = Depends(get_auth_service),
) -> AdminLogoutResponse:
    """Terminate the administrator session and revoke its token server-side.

    US 02.3 - AC-02.3.1: the audit watermark is written first, then the cookie is
    cleared, so the submitted JWT is already rejected by the time the browser is
    told the session ended. Reaching this endpoint therefore requires a session
    that is still valid; a second call answers 401 instead of 200.
    """
    auth_service.logout_admin(
        admin_user_name=current_admin.user_name,
        client_ip=resolve_client_ip(request),
    )
    settings = get_settings()
    response.delete_cookie(
        key=settings.ADMIN_SESSION_COOKIE_NAME,
        path=ADMIN_SESSION_COOKIE_PATH,
    )
    return AdminLogoutResponse(data=AdminLogoutDataResponse())
