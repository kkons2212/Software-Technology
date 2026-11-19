"""Rate limiting framework configuration and dynamic rate_limit decorator."""

import time
from collections.abc import Callable

from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import build_error_envelope

DISABLED_KEYWORDS = frozenset({"disabled", "none", "off", "unlimited", ""})
UNLIMITED_RATE = "1000000/minute"


def get_real_client_ip(request: Request) -> str:
    """Extract real client IP address through reverse proxy (e.g., Vercel / Cloudflare)."""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=get_real_client_ip,
    enabled=settings.RATE_LIMIT_ENABLED,
)


def rate_limit(setting_name: str) -> Callable:
    """Apply a dynamic rate limit resolved from settings.<setting_name>.

    Supports:
    - Global on/off via settings.RATE_LIMIT_ENABLED
    - Per-endpoint on/off via settings.<setting_name> = "disabled" / "none" / "off" / ""
    - Custom rate limits via settings.<setting_name> = "5/minute", "10/second", etc.
    """

    def get_limit() -> str:
        if not settings.RATE_LIMIT_ENABLED:
            return UNLIMITED_RATE
        raw = getattr(settings, setting_name, "120/minute")
        if not raw or str(raw).strip().lower() in DISABLED_KEYWORDS:
            return UNLIMITED_RATE
        return str(raw).strip()

    def is_exempt() -> bool:
        if not settings.RATE_LIMIT_ENABLED:
            return True
        raw = getattr(settings, setting_name, "120/minute")
        return not raw or str(raw).strip().lower() in DISABLED_KEYWORDS

    return limiter.limit(get_limit, exempt_when=is_exempt, override_defaults=True)


def custom_rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Format HTTP 429 response using the standardized application error envelope."""
    retry_after = 60
    try:
        if exc.limit and hasattr(request.app.state, "limiter"):
            lim = request.app.state.limiter
            key = lim._key_func(request)
            endpoint = request.url.path
            scope = exc.limit.scope or endpoint
            stats = lim.limiter.get_window_stats(exc.limit.limit, key, scope)
            if stats:
                retry_after = max(1, int(stats[0] - time.time()))
    except Exception:
        pass

    content = build_error_envelope(
        code="RATE_LIMIT_EXCEEDED",
        message=f"Rate limit exceeded: {exc.detail}",
        details={"rate_limit": str(exc.detail), "retry_after_seconds": retry_after},
    )
    headers = {
        "Retry-After": str(retry_after),
        "X-RateLimit-Limit": str(exc.limit.limit.amount) if exc.limit else "0",
    }
    return JSONResponse(content=content, status_code=429, headers=headers)
