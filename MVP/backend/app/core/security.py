"""Bcrypt password hashing and JWT administrator session helpers.

US 02.1 - AC-02.1.2 (one-way Bcrypt hashes, cost factor >= 12) and
AC-02.1.3 (HS256 JWT with a hard 60-minute expiration).
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Final

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

PASSWORD_HASH_SCHEME: Final = "bcrypt"
PASSWORD_HASH_CONTEXT: Final = CryptContext(
    schemes=[PASSWORD_HASH_SCHEME], deprecated="auto"
)
JWT_SUBJECT_CLAIM = "sub"
JWT_ISSUED_AT_CLAIM = "iat"
JWT_EXPIRES_AT_CLAIM = "exp"
SECONDS_PER_MINUTE = 60


def hash_password(plain_password: str) -> str:
    """Return a one-way Bcrypt hash using the configured cost factor (>= 12)."""
    return PASSWORD_HASH_CONTEXT.hash(
        plain_password, rounds=get_settings().BCRYPT_ROUNDS
    )


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Constant-time Bcrypt comparison; a malformed stored hash never raises."""
    try:
        return PASSWORD_HASH_CONTEXT.verify(plain_password, password_hash)
    except ValueError:
        return False


def create_admin_access_token(admin_user_name: str) -> str:
    """Sign a 60-minute HS256 session token for the given administrator."""
    settings = get_settings()
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    claims = {
        JWT_SUBJECT_CLAIM: admin_user_name,
        JWT_ISSUED_AT_CLAIM: issued_at,
        JWT_EXPIRES_AT_CLAIM: expires_at,
    }
    return jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_admin_access_token(access_token: str) -> dict[str, Any] | None:
    """Decode and verify a session token; returns None for any invalid token."""
    settings = get_settings()
    try:
        return jwt.decode(
            access_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None


def get_access_token_max_age_seconds() -> int:
    """Cookie lifetime in seconds, mirroring the JWT hard expiration."""
    return get_settings().ACCESS_TOKEN_EXPIRE_MINUTES * SECONDS_PER_MINUTE
