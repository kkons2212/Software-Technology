"""Authentication business logic for the Administrative Portal.

US 02.1 - TSK-02.1.3: Bcrypt verification, 60-minute JWT issuance and `Audit`
logging with the client IP. HTTP status codes are decided here, never in the
repository layer.
"""

from fastapi import status

from app.core.exceptions import ApiError
from app.core.security import (
    JWT_SUBJECT_CLAIM,
    create_admin_access_token,
    decode_admin_access_token,
    verify_password,
)
from app.models.audit import AUDIT_STATUS_FAILED, AUDIT_STATUS_SUCCESS
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import (
    AdminLoginRequest,
    AdminProfileResponse,
    AdminSessionTokenDTO,
)

INVALID_CREDENTIALS_ERROR_CODE = "INVALID_CREDENTIALS"
INVALID_CREDENTIALS_ERROR_MESSAGE = "Invalid username or password"
UNAUTHENTICATED_ERROR_CODE = "UNAUTHENTICATED"
UNAUTHENTICATED_ERROR_MESSAGE = "Administrator session is missing or has expired."
LOGIN_SUCCESS_DETAILS = "ADMIN_LOGIN_SUCCESS"
LOGIN_FAILED_DETAILS = "ADMIN_LOGIN_FAILED"
LOGIN_INACTIVE_ACCOUNT_DETAILS = "ADMIN_LOGIN_INACTIVE_ACCOUNT"


class AuthService:
    """Owns every authentication rule of the Administrative Portal."""

    def __init__(
        self,
        user_repository: UserRepository,
        audit_repository: AuditRepository,
    ) -> None:
        self.user_repository = user_repository
        self.audit_repository = audit_repository

    def authenticate_admin(
        self,
        payload: AdminLoginRequest,
        client_ip: str | None,
    ) -> AdminSessionTokenDTO:
        """Verify credentials, issue a 60-minute JWT and record the attempt."""
        administrator = self._find_administrator(payload.username)

        if administrator is None:
            # `Audit.UserName` is a NOT NULL foreign key to `User`, so an unknown
            # identifier cannot be persisted here. The generic 401 raised below
            # still prevents user enumeration for the caller.
            raise self._build_invalid_credentials_error()

        if not verify_password(payload.password, administrator.password_hash):
            self._record_login_failure(administrator, client_ip, LOGIN_FAILED_DETAILS)
            raise self._build_invalid_credentials_error()

        if not administrator.is_active:
            self._record_login_failure(
                administrator, client_ip, LOGIN_INACTIVE_ACCOUNT_DETAILS
            )
            raise self._build_invalid_credentials_error()

        self.audit_repository.create_log_entry(
            user_name=administrator.user_name,
            status=AUDIT_STATUS_SUCCESS,
            ip_address=client_ip,
            details=LOGIN_SUCCESS_DETAILS,
        )
        return AdminSessionTokenDTO(
            access_token=create_admin_access_token(administrator.user_name),
            admin=AdminProfileResponse.model_validate(administrator),
        )

    def resolve_authenticated_admin(
        self,
        access_token: str | None,
    ) -> AdminProfileResponse:
        """Resolve the administrator behind an HttpOnly session cookie value."""
        if not access_token:
            raise self._build_unauthenticated_error()

        claims = decode_admin_access_token(access_token)
        admin_user_name = claims.get(JWT_SUBJECT_CLAIM) if claims else None
        administrator = (
            self.user_repository.find_by_username(admin_user_name)
            if admin_user_name
            else None
        )
        if administrator is None or not administrator.is_active:
            raise self._build_unauthenticated_error()

        return AdminProfileResponse.model_validate(administrator)

    def _find_administrator(self, login_identifier: str) -> User | None:
        """Resolve an identifier that may be either a username or an email."""
        administrator = self.user_repository.find_by_username(login_identifier)
        if administrator is None:
            administrator = self.user_repository.find_by_email(login_identifier)
        return administrator

    def _record_login_failure(
        self,
        administrator: User,
        client_ip: str | None,
        details: str,
    ) -> None:
        """Append a FAILED audit row without leaking which check failed."""
        self.audit_repository.create_log_entry(
            user_name=administrator.user_name,
            status=AUDIT_STATUS_FAILED,
            ip_address=client_ip,
            details=details,
        )

    @staticmethod
    def _build_invalid_credentials_error() -> ApiError:
        return ApiError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=INVALID_CREDENTIALS_ERROR_CODE,
            message=INVALID_CREDENTIALS_ERROR_MESSAGE,
        )

    @staticmethod
    def _build_unauthenticated_error() -> ApiError:
        return ApiError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=UNAUTHENTICATED_ERROR_CODE,
            message=UNAUTHENTICATED_ERROR_MESSAGE,
        )
