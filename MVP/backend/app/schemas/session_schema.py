"""Pydantic schemas for Visitor Session recovery and management (US 06.3)."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

SESSION_CODE_MIN_LENGTH = 3
SESSION_CODE_MAX_LENGTH = 32

CleanSessionCode = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=SESSION_CODE_MIN_LENGTH,
        max_length=SESSION_CODE_MAX_LENGTH,
    ),
]


class SessionRestoreRequest(BaseModel):
    """Payload to restore a visitor session on a secondary device or fresh browser."""

    session_code: CleanSessionCode = Field(
        ...,
        description="Session code previously issued upon checkout (e.g., CCT-894201 or 894201).",
    )

    @field_validator("session_code", mode="after")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        code = v.strip().upper()
        # Automatically prepend 'CCT-' if user only entered the 6-character hex/alphanumeric code
        if not code.startswith("CCT-") and len(code) == 6:
            code = f"CCT-{code}"
        return code


class SessionRestoreData(BaseModel):
    """Normalized payload detailing restored session state."""

    model_config = ConfigDict(from_attributes=True)

    session_id: str = Field(..., description="Unique database session identifier.")
    session_code: str = Field(..., description="Normalized session code.")
    session_token: str = Field(
        ..., description="Access bearer token for tour authentication."
    )
    status: str = Field(default="ACTIVE", description="Session status.")
    expires_at: datetime = Field(
        ..., description="Exact timestamp when session access terminates."
    )
    remaining_seconds: int = Field(
        ..., description="Remaining duration in seconds before expiration."
    )
    preferred_language: str = Field(
        default="vi", description="Language preference saved with the session."
    )


class SessionRestoreResponse(BaseModel):
    """Response returned upon successful session recovery."""

    model_config = ConfigDict(from_attributes=True)

    session_id: str = Field(..., description="Unique database session identifier.")
    session_code: str = Field(..., description="Normalized session code.")
    session_token: str = Field(
        ..., description="Access bearer token for tour authentication."
    )
    status: str = Field(default="ACTIVE", description="Session status.")
    expires_at: datetime = Field(
        ..., description="Exact timestamp when session access terminates."
    )
    remaining_seconds: int = Field(
        ..., description="Remaining duration in seconds before expiration."
    )
    preferred_language: str = Field(
        default="vi", description="Language preference saved with the session."
    )
    success: bool = Field(default=True, description="Indicates operation success.")
    data: SessionRestoreData | None = Field(
        default=None, description="Enveloped data payload."
    )
