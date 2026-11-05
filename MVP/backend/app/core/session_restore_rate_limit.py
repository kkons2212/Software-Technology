"""Process-local sliding-window limits for session restore attempts."""

import hashlib
import math
import threading
import time
from collections import OrderedDict, deque

WINDOW_SECONDS = 60
MAX_ATTEMPTS_PER_IP = 30
MAX_ATTEMPTS_PER_CODE = 5
MAX_TRACKED_KEYS = 10_000


class SessionRestoreRateLimiter:
    """Limit guessing by both client address and a hashed session code."""

    def __init__(self) -> None:
        self._attempts: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def check(self, client_ip: str, session_code: str) -> int:
        """Record an attempt and return retry seconds, or zero when allowed."""
        now = time.monotonic()
        code_digest = hashlib.sha256(
            session_code.strip().upper().encode("utf-8")
        ).hexdigest()
        ip_digest = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()
        limits = (
            (f"ip:{ip_digest}", MAX_ATTEMPTS_PER_IP),
            (f"code:{code_digest}", MAX_ATTEMPTS_PER_CODE),
        )

        with self._lock:
            retry_after = 0
            for key, limit in limits:
                attempts = self._attempts.get(key)
                if attempts is None:
                    continue
                while attempts and now - attempts[0] >= WINDOW_SECONDS:
                    attempts.popleft()
                if attempts:
                    self._attempts.move_to_end(key)
                else:
                    del self._attempts[key]

                if len(attempts) >= limit:
                    retry_after = max(
                        retry_after,
                        math.ceil(WINDOW_SECONDS - (now - attempts[0])),
                    )

            if retry_after == 0:
                for key, _ in limits:
                    self._attempts.setdefault(key, deque()).append(now)
                    self._attempts.move_to_end(key)

                while len(self._attempts) > MAX_TRACKED_KEYS:
                    self._attempts.popitem(last=False)

        return retry_after


session_restore_rate_limiter = SessionRestoreRateLimiter()
