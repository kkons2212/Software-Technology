"""Pydantic request/response schemas for Administrator authentication.

US 02.1 - naming follows dev_rules Section 1.4.3 (`*Request` / `*Response` /
`*DTO` directional suffixes).
US 02.3 - adds the termination envelope returned by `POST /api/v1/auth/logout`.
"""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ADMIN_USERNAME_MAX_LENGTH = 255
ADMIN_PASSWORD_MAX_LENGTH = 128
ADMIN_LOGOUT_MESSAGE = "Administrator session terminated"
# Padded usernames are a common paste artefact and are safe to normalize; the
# password is deliberately left byte-exact so Bcrypt compares what was typed.
TrimmedUsername = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=ADMIN_USERNAME_MAX_LENGTH,
    ),
]


class AdminLoginRequest(BaseModel):
    """Incoming credentials: the username or the administrator email."""

    username: TrimmedUsername
    password: str = Field(min_length=1, max_length=ADMIN_PASSWORD_MAX_LENGTH)


class AdminProfileResponse(BaseModel):
    """Outgoing administrator profile; credential material is never exposed."""

    model_config = ConfigDict(from_attributes=True)

    user_name: str
    email: str
    full_name: str | None = None


class AdminSessionDataResponse(BaseModel):
    """Payload nested under the `data` key of a successful authentication."""

    admin: AdminProfileResponse


class AdminSessionResponse(BaseModel):
    """Successful authentication envelope consumed by the Admin Portal."""

    success: bool = True
    data: AdminSessionDataResponse


class AdminSessionTokenDTO(BaseModel):
    """Internal transfer object carrying the raw JWT back up to the controller."""

    access_token: str
    admin: AdminProfileResponse


class AdminLogoutDataResponse(BaseModel):
    """Payload nested under `data` once the session has been terminated."""

    message: str = ADMIN_LOGOUT_MESSAGE


class AdminLogoutResponse(BaseModel):
    """Termination envelope consumed by the Admin Portal (US 02.3)."""

    success: bool = True
    data: AdminLogoutDataResponse
