"""PayPal REST API Client for Sandbox and Live international transactions (US 06.1)."""

import base64
import logging
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SANDBOX_API_BASE = "https://api-m.sandbox.paypal.com"
LIVE_API_BASE = "https://api-m.paypal.com"


class PayPalClient:
    """Encapsulates PayPal Orders v2 API interactions for Sandbox and Live modes."""

    def __init__(self) -> None:
        self._cached_token: str | None = None
        self._token_expires_at: float = 0.0

    @property
    def base_url(self) -> str:
        mode = getattr(settings, "PAYPAL_MODE", "sandbox").strip().lower()
        return LIVE_API_BASE if mode == "live" else SANDBOX_API_BASE

    def is_configured(self) -> bool:
        """Check if required PayPal API credentials exist in settings."""
        return bool(
            settings.PAYPAL_CLIENT_ID
            and settings.PAYPAL_CLIENT_SECRET
            and not settings.PAYPAL_CLIENT_ID.startswith("your_")
        )

    async def get_access_token(self) -> str | None:
        """Fetch or return cached OAuth2 Bearer token from PayPal."""
        if not self.is_configured():
            return None

        # Return cached token if valid for at least 60 more seconds
        if self._cached_token and time.time() < self._token_expires_at - 60:
            return self._cached_token

        auth_str = f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}"
        encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "client_credentials"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/oauth2/token",
                    headers=headers,
                    data=data,
                )
                if res.status_code == 200:
                    token_data = res.json()
                    self._cached_token = token_data.get("access_token")
                    expires_in = int(token_data.get("expires_in", 3600))
                    self._token_expires_at = time.time() + expires_in
                    return self._cached_token

                logger.warning(
                    "PayPal OAuth token request rejected: status=%s, body=%s",
                    res.status_code,
                    res.text,
                )
        except Exception as exc:
            logger.warning("Failed to obtain PayPal OAuth token: %s", exc)

        return None

    async def create_order(
        self,
        order_id: str,
        amount_vnd: int,
        return_url: str,
        cancel_url: str,
    ) -> dict[str, Any] | None:
        """Create a PayPal v2 checkout order and return the approval URL and PayPal order ID."""
        token = await self.get_access_token()
        if not token:
            return None

        # Convert VND to USD with configured rate (minimum $1.00 USD)
        rate = getattr(settings, "PAYPAL_EXCHANGE_RATE", 25000.0) or 25000.0
        amount_usd = max(1.00, round(amount_vnd / rate, 2))
        amount_str = f"{amount_usd:.2f}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": order_id,
                    "description": f"Cu Chi Tunnels Smart Audio Guide ({order_id})",
                    "amount": {
                        "currency_code": settings.PAYPAL_CURRENCY or "USD",
                        "value": amount_str,
                    },
                }
            ],
            "application_context": {
                "brand_name": "Cu Chi Historical Relic",
                "landing_page": "BILLING",
                "user_action": "PAY_NOW",
                "return_url": return_url,
                "cancel_url": cancel_url,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v2/checkout/orders",
                    headers=headers,
                    json=payload,
                )
                if res.status_code in (200, 201):
                    order_data = res.json()
                    paypal_order_id = order_data.get("id")
                    approve_url = None
                    for link in order_data.get("links", []):
                        if link.get("rel") == "approve":
                            approve_url = link.get("href")
                            break

                    return {
                        "paypal_order_id": paypal_order_id,
                        "approve_url": approve_url,
                        "amount_usd": amount_str,
                        "status": order_data.get("status"),
                    }

                logger.warning(
                    "PayPal order creation failed: status=%s, body=%s",
                    res.status_code,
                    res.text,
                )
        except Exception as exc:
            logger.warning("Error calling PayPal create order API: %s", exc)

        return None

    async def capture_order(self, paypal_order_id: str) -> dict[str, Any] | None:
        """Capture an approved PayPal payment order."""
        token = await self.get_access_token()
        if not token:
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture",
                    headers=headers,
                )
                if res.status_code in (200, 201):
                    return res.json()
                logger.warning(
                    "PayPal capture failed: status=%s, body=%s",
                    res.status_code,
                    res.text,
                )
        except Exception as exc:
            logger.warning("Error capturing PayPal payment: %s", exc)

        return None


# Module singleton instance
paypal_client = PayPalClient()
