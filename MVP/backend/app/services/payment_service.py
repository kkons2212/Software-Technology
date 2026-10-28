"""PaymentService orchestrating digital admission checkout, VietQR generation, and order polling (US 06.1)."""

import hashlib
import hmac
import logging
import urllib.parse
from datetime import datetime, timedelta

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.payment_schema import (
    CheckoutCreateRequest,
    CheckoutCreateResponse,
    OrderStatusResponse,
)

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# CONSTANTS & DEFAULT DEMO BANKING CREDENTIALS
# ------------------------------------------------------------------------------
DEFAULT_BANK_BIN = "970422"  # MBBank BIN
DEFAULT_BANK_NAME = "MBBank (Ngân hàng Quân Đội)"
DEFAULT_ACCOUNT_NUMBER = "0909123456"
DEFAULT_ACCOUNT_NAME = "CU CHI TUNNELS SMART GUIDE"
PAYOS_API_ENDPOINT = "https://api-merchant.payos.vn/v2/payment-requests"
QR_EXPIRATION_MINUTES = 15


class PaymentService:
    def __init__(self, transaction_repo: TransactionRepository):
        self.transaction_repo = transaction_repo

    def _has_payos_credentials(self) -> bool:
        """Check if production/sandbox PayOS API keys are configured in environment."""
        return bool(
            settings.PAYOS_CLIENT_ID
            and settings.PAYOS_API_KEY
            and settings.PAYOS_CHECKSUM_KEY
        )

    def _generate_payos_signature(self, data: dict, checksum_key: str) -> str:
        """Compute HMAC-SHA256 signature required by PayOS payment gateway."""
        sorted_keys = sorted(data.keys())
        sign_string = "&".join(
            f"{k}={data[k]}" for k in sorted_keys if data[k] is not None
        )
        return hmac.new(
            checksum_key.encode("utf-8"),
            sign_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    async def _call_payos_sandbox(
        self,
        order_code: int,
        amount: int,
        description: str,
        return_url: str,
        cancel_url: str,
    ) -> dict | None:
        """Send payment link creation request to PayOS Sandbox API."""
        sign_data = {
            "amount": amount,
            "cancelUrl": cancel_url,
            "description": description[:25],
            "orderCode": order_code,
            "returnUrl": return_url,
        }
        signature = self._generate_payos_signature(
            sign_data, settings.PAYOS_CHECKSUM_KEY
        )
        payload = {
            **sign_data,
            "signature": signature,
        }
        headers = {
            "x-client-id": settings.PAYOS_CLIENT_ID,
            "x-api-key": settings.PAYOS_API_KEY,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    PAYOS_API_ENDPOINT, json=payload, headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "00":
                        return data.get("data")
                logger.warning(
                    "PayOS Sandbox returned non-success response: status=%s, body=%s",
                    res.status_code,
                    res.text,
                )
        except Exception as exc:
            logger.warning("Error communicating with PayOS Sandbox API: %s", exc)

        return None

    def _build_vietqr_url(
        self, account_no: str, bank_bin: str, amount: int, memo: str
    ) -> str:
        """Construct standard Napas247 VietQR image URL with amount and transfer memo."""
        encoded_memo = urllib.parse.quote(memo)
        return (
            f"https://img.vietqr.io/image/{bank_bin}-{account_no}-compact2.png"
            f"?amount={amount}&addInfo={encoded_memo}&accountName={urllib.parse.quote(DEFAULT_ACCOUNT_NAME)}"
        )

    async def create_checkout_order(
        self,
        payload: CheckoutCreateRequest,
    ) -> CheckoutCreateResponse:
        """Initialize digital admission checkout order via VietQR or Card (US 06.1)."""
        fee_amount = settings.AUDIO_GUIDE_SERVICE_FEE
        currency = settings.SERVICE_FEE_CURRENCY
        payment_method = payload.payment_method.upper()

        # Step 1: Create PENDING transaction in MySQL database
        gateway_name = "PAYOS" if payment_method == "VIETQR" else "STRIPE"
        txn = self.transaction_repo.create_transaction(
            pay_amount=fee_amount,
            payment_gateway=gateway_name,
            payment_method=payment_method,
            currency=currency,
        )

        order_id = txn.transaction_id
        transfer_memo = f"CCT {order_id[-6:]}"
        expires_at = datetime.utcnow() + timedelta(minutes=QR_EXPIRATION_MINUTES)

        qr_code_url = None
        checkout_url = None

        if payment_method == "VIETQR":
            # Attempt to call PayOS Sandbox API if credentials exist
            if self._has_payos_credentials():
                # Order code must be integer for PayOS
                try:
                    numeric_order_code = (
                        int(datetime.utcnow().timestamp() * 1000) % 100000000
                    )
                except Exception:
                    numeric_order_code = 10001

                payos_data = await self._call_payos_sandbox(
                    order_code=numeric_order_code,
                    amount=fee_amount,
                    description=transfer_memo,
                    return_url="http://localhost:5173/tour",
                    cancel_url="http://localhost:5173/tour",
                )
                if payos_data:
                    qr_code_url = payos_data.get("qrCode")
                    checkout_url = payos_data.get("checkoutUrl")

            # Graceful Fallback: Build standard Napas247 VietQR if PayOS returned None or credentials missing
            if not qr_code_url:
                qr_code_url = self._build_vietqr_url(
                    account_no=DEFAULT_ACCOUNT_NUMBER,
                    bank_bin=DEFAULT_BANK_BIN,
                    amount=fee_amount,
                    memo=transfer_memo,
                )

            return CheckoutCreateResponse(
                order_id=order_id,
                pay_amount=fee_amount,
                currency=currency,
                payment_method=payment_method,
                qr_code_url=qr_code_url,
                checkout_url=checkout_url,
                transfer_bank=DEFAULT_BANK_NAME,
                transfer_account=DEFAULT_ACCOUNT_NUMBER,
                transfer_account_name=DEFAULT_ACCOUNT_NAME,
                transfer_content=transfer_memo,
                status="PENDING",
                expires_at=expires_at,
            )

        # Card payment flow (Stripe)
        checkout_url = f"/api/v1/payments/card-checkout?order_id={order_id}"
        return CheckoutCreateResponse(
            order_id=order_id,
            pay_amount=fee_amount,
            currency=currency,
            payment_method=payment_method,
            qr_code_url=None,
            checkout_url=checkout_url,
            status="PENDING",
            expires_at=expires_at,
        )

    def get_order_status(self, order_id: str) -> OrderStatusResponse:
        """Poll order status with sub-100ms response time enforcing JIT DB lifecycle."""
        txn = self.transaction_repo.get_by_id(order_id)
        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found.",
            )

        session_code = None
        session_token = None
        session_expires_at = None

        if txn.session and txn.status == "PAID":
            session_code = txn.session.SessionCode
            session_token = txn.session.SessionToken
            session_expires_at = txn.session.Expire_at

        return OrderStatusResponse(
            order_id=txn.transaction_id,
            status=txn.status,
            pay_amount=txn.pay_amount,
            currency=txn.currency,
            paid_at=txn.paid_at,
            session_code=session_code,
            session_token=session_token,
            session_expires_at=session_expires_at,
            expires_at=session_expires_at,
        )

    def simulate_payment_success(
        self,
        order_id: str,
        preferred_language: str = "vi",
    ) -> OrderStatusResponse:
        """Simulate payment success for developer testing and demonstration without real bank transaction."""
        txn = self.transaction_repo.get_by_id(order_id)
        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found.",
            )

        updated_txn, session = self.transaction_repo.mark_as_paid(
            transaction_id=order_id,
            preferred_language=preferred_language,
            gateway_transaction_id=f"SIM_{order_id}",
        )

        return OrderStatusResponse(
            order_id=updated_txn.transaction_id,
            status=updated_txn.status,
            pay_amount=updated_txn.pay_amount,
            currency=updated_txn.currency,
            paid_at=updated_txn.paid_at,
            session_code=session.SessionCode,
            session_token=session.SessionToken,
            session_expires_at=session.Expire_at,
            expires_at=session.Expire_at,
        )
