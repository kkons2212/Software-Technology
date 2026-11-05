"""PaymentService orchestrating digital admission checkout, VietQR generation, order polling, and webhook activation (US 06.1, US 06.2)."""

import hashlib
import hmac
import logging
import urllib.parse
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.integrations.paypal_client import paypal_client
from app.models.transaction import Transaction
from app.repositories.session_repository import SessionRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.payment_schema import (
    CheckoutCreateRequest,
    CheckoutCreateResponse,
    OrderStatusResponse,
    PayOSWebhookPayload,
    WebhookResponse,
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
SUPPORTED_LANGUAGES = {"vi", "en", "ja", "ko", "zh"}


class PaymentService:
    def __init__(
        self,
        transaction_repo: TransactionRepository,
        session_repo: SessionRepository | None = None,
    ):
        self.transaction_repo = transaction_repo
        self.session_repo = session_repo

    def _has_payos_credentials(self) -> bool:
        """Check if production/sandbox PayOS API keys are configured in environment."""
        has_client = bool(settings.PAYOS_CLIENT_ID)
        has_api_key = bool(settings.PAYOS_API_KEY)
        has_checksum = bool(settings.PAYOS_CHECKSUM_KEY)
        is_ready = bool(has_client and has_api_key and has_checksum)
        return is_ready

    def _generate_payos_signature(self, data: dict[str, Any], checksum_key: str) -> str:
        """Compute HMAC-SHA256 signature required by PayOS payment gateway."""
        sorted_keys = sorted(data.keys())
        sign_string = "&".join(
            f"{k}={data[k]}" for k in sorted_keys if data[k] is not None
        )
        signature = hmac.new(
            checksum_key.encode("utf-8"),
            sign_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return signature

    def verify_payos_webhook_signature(
        self, data: dict[str, Any], signature: str
    ) -> bool:
        """Verify HMAC-SHA256 signature against PayOS payload data using PAYOS_CHECKSUM_KEY."""
        checksum_key = settings.PAYOS_CHECKSUM_KEY
        is_valid = False
        if checksum_key and signature:
            expected_sig = self._generate_payos_signature(data, checksum_key)
            is_valid = hmac.compare_digest(expected_sig.lower(), signature.lower())
        else:
            logger.warning(
                "Checksum key or signature missing for webhook verification."
            )
        return is_valid

    async def _call_payos_sandbox(
        self,
        order_code: int,
        amount: int,
        description: str,
        return_url: str,
        cancel_url: str,
    ) -> dict | None:
        """Send payment link creation request to PayOS Sandbox API with single exit."""
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

        payos_data: dict | None = None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    PAYOS_API_ENDPOINT, json=payload, headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "00":
                        payos_data = data.get("data")
                if not payos_data:
                    logger.warning(
                        "PayOS Sandbox returned non-success response: status=%s, body=%s",
                        res.status_code,
                        res.text,
                    )
        except Exception as exc:
            logger.warning("Error communicating with PayOS Sandbox API: %s", exc)

        return payos_data

    def _build_vietqr_url(
        self, account_no: str, bank_bin: str, amount: int, memo: str
    ) -> str:
        """Construct standard Napas247 VietQR image URL with amount and transfer memo."""
        encoded_memo = urllib.parse.quote(memo)
        url = (
            f"https://img.vietqr.io/image/{bank_bin}-{account_no}-compact2.png"
            f"?amount={amount}&addInfo={encoded_memo}&accountName={urllib.parse.quote(DEFAULT_ACCOUNT_NAME)}"
        )
        return url

    async def create_checkout_order(
        self,
        payload: CheckoutCreateRequest,
    ) -> CheckoutCreateResponse:
        """Initialize digital admission checkout order via VietQR or Card (US 06.1) adhering to SISE."""
        fee_amount = settings.AUDIO_GUIDE_SERVICE_FEE
        currency = settings.SERVICE_FEE_CURRENCY
        payment_method = payload.payment_method.upper()

        if (
            payment_method != "VIETQR"
            and not paypal_client.is_configured()
            and not settings.is_development
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="PayPal checkout is not configured.",
            )

        target_lang = (payload.preferred_language or "vi").strip().lower()
        pref_lang = target_lang if target_lang in SUPPORTED_LANGUAGES else "vi"

        gateway_name = "PAYOS" if payment_method == "VIETQR" else "PAYPAL"
        txn = self.transaction_repo.create_transaction(
            pay_amount=fee_amount,
            payment_gateway=gateway_name,
            payment_method=payment_method,
            currency=currency,
            gateway_payload={"preferred_language": pref_lang},
        )

        order_id = txn.transaction_id
        transfer_memo = f"CCT {order_id[-6:]}"
        expires_at = datetime.utcnow() + timedelta(minutes=QR_EXPIRATION_MINUTES)
        qr_code_url: str | None = None
        checkout_url: str | None = None

        if payment_method == "VIETQR":
            if self._has_payos_credentials():
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
                    self.transaction_repo.update_gateway_info(
                        txn, str(numeric_order_code)
                    )

            if not qr_code_url:
                qr_code_url = self._build_vietqr_url(
                    account_no=DEFAULT_ACCOUNT_NUMBER,
                    bank_bin=DEFAULT_BANK_BIN,
                    amount=fee_amount,
                    memo=transfer_memo,
                )
        else:
            if paypal_client.is_configured():
                return_url = f"http://localhost:5173/tour?payment_success=true&order_id={order_id}"
                cancel_url = "http://localhost:5173/tour?payment_cancel=true"
                paypal_data = await paypal_client.create_order(
                    order_id=order_id,
                    amount_vnd=fee_amount,
                    return_url=return_url,
                    cancel_url=cancel_url,
                )
                if (
                    paypal_data
                    and paypal_data.get("approve_url")
                    and paypal_data.get("paypal_order_id")
                ):
                    checkout_url = paypal_data["approve_url"]
                    gateway_id = str(paypal_data.get("paypal_order_id") or "")
                    self.transaction_repo.update_gateway_info(txn, gateway_id)

            if not checkout_url:
                if not settings.is_development:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="PayPal checkout is not configured.",
                    )
                checkout_url = f"/api/v1/payments/paypal-checkout?order_id={order_id}"

        response = CheckoutCreateResponse(
            order_id=order_id,
            pay_amount=fee_amount,
            currency=currency,
            payment_method=payment_method,
            qr_code_url=qr_code_url,
            checkout_url=checkout_url,
            transfer_bank=DEFAULT_BANK_NAME if payment_method == "VIETQR" else None,
            transfer_account=(
                DEFAULT_ACCOUNT_NUMBER if payment_method == "VIETQR" else None
            ),
            transfer_account_name=(
                DEFAULT_ACCOUNT_NAME if payment_method == "VIETQR" else None
            ),
            transfer_content=transfer_memo if payment_method == "VIETQR" else None,
            status="PENDING",
            expires_at=expires_at,
        )
        return response

    def get_order_status(self, order_id: str) -> OrderStatusResponse:
        """Poll order status with sub-100ms response time adhering to SISE."""
        # Phase 1: Precondition Gate
        txn = self.transaction_repo.get_by_id(order_id)
        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found.",
            )

        # Phase 2: Compute
        session_code = None
        session_token = None
        session_expires_at = None

        if txn.session and txn.status == "PAID":
            session_code = txn.session.SessionCode
            session_token = txn.session.SessionToken
            session_expires_at = txn.session.Expire_at

        # Phase 3: Unified Exit
        response = OrderStatusResponse(
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
        return response

    def simulate_payment_success(
        self,
        order_id: str,
        preferred_language: str = "vi",
    ) -> OrderStatusResponse:
        """Simulate payment success for developer testing and demonstration adhering to SISE."""
        # Phase 1: Precondition Gate
        if not settings.is_development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment simulation is available only in development.",
            )

        txn = self.transaction_repo.get_by_id(order_id)
        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found.",
            )

        # Phase 2: Compute
        saved_lang = None
        if txn.gateway_payload and isinstance(txn.gateway_payload, dict):
            saved_lang = txn.gateway_payload.get("preferred_language")
        resolved_lang = (
            preferred_language
            if preferred_language and preferred_language != "vi"
            else (saved_lang or "vi")
        )
        resolved_lang = resolved_lang.strip().lower()
        if resolved_lang not in SUPPORTED_LANGUAGES:
            resolved_lang = "vi"

        updated_txn, session = self.transaction_repo.mark_as_paid(
            transaction_id=order_id,
            preferred_language=resolved_lang,
            gateway_transaction_id=f"SIM_{order_id}",
        )

        # Phase 3: Unified Exit
        response = OrderStatusResponse(
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
        return response

    async def capture_paypal_order(
        self,
        order_id: str,
        paypal_order_id: str | None = None,
        preferred_language: str = "vi",
    ) -> OrderStatusResponse:
        """Capture and verify a PayPal order before activating its visitor session."""
        # Phase 1: Precondition Gate
        txn = self.transaction_repo.get_by_id(order_id)
        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found.",
            )

        if txn.payment_gateway != "PAYPAL":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is not associated with PayPal.",
            )

        # Phase 2: Compute
        if txn.status == "PAID":
            response = self.get_order_status(order_id)
        else:
            if txn.status != "PENDING":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="PayPal order is not awaiting capture.",
                )
            if not paypal_client.is_configured():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="PayPal capture is not configured.",
                )

            stored_paypal_id = txn.gateway_transaction_id
            if not stored_paypal_id or (
                paypal_order_id and paypal_order_id != stored_paypal_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="PayPal order does not match this checkout.",
                )

            capture_response = await paypal_client.capture_order(stored_paypal_id)
            capture_id = self._get_verified_paypal_capture_id(
                capture_response, txn, stored_paypal_id
            )
            if capture_id is None:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="PayPal has not confirmed a successful payment.",
                )

            saved_lang = None
            if txn.gateway_payload and isinstance(txn.gateway_payload, dict):
                saved_lang = txn.gateway_payload.get("preferred_language")
            resolved_lang = (
                preferred_language
                if preferred_language and preferred_language != "vi"
                else (saved_lang or "vi")
            )
            resolved_lang = resolved_lang.strip().lower()
            if resolved_lang not in SUPPORTED_LANGUAGES:
                resolved_lang = "vi"

            updated_txn, session = self.transaction_repo.mark_as_paid(
                transaction_id=order_id,
                preferred_language=resolved_lang,
                gateway_transaction_id=capture_id,
            )
            response = OrderStatusResponse(
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

        # Phase 3: Unified Exit
        return response

    @staticmethod
    def _get_verified_paypal_capture_id(
        capture_response: dict[str, Any] | None,
        txn: Transaction,
        paypal_order_id: str,
    ) -> str | None:
        """Return a capture ID only when PayPal confirms the expected amount and order."""
        if not capture_response or capture_response.get("status") != "COMPLETED":
            return None

        try:
            exchange_rate = Decimal(str(settings.PAYPAL_EXCHANGE_RATE))
            expected_amount = max(
                Decimal("1.00"),
                Decimal(str(txn.pay_amount)) / exchange_rate,
            ).quantize(Decimal("0.01"))
        except (ArithmeticError, ValueError):
            logger.error("Invalid PayPal exchange rate configuration.")
            return None

        expected_currency = settings.PAYPAL_CURRENCY or "USD"
        for purchase_unit in capture_response.get("purchase_units", []):
            if purchase_unit.get("reference_id") != txn.transaction_id:
                continue
            for capture in purchase_unit.get("payments", {}).get("captures", []):
                amount = capture.get("amount") or {}
                if (
                    capture.get("status") == "COMPLETED"
                    and amount.get("currency_code") == expected_currency
                    and amount.get("value") == f"{expected_amount:.2f}"
                    and capture.get("id")
                ):
                    return str(capture["id"])

        logger.warning(
            "PayPal capture response did not match order '%s' (PayPal order '%s').",
            txn.transaction_id,
            paypal_order_id,
        )
        return None

    def process_payment_webhook(
        self,
        payload: PayOSWebhookPayload | dict[str, Any],
    ) -> WebhookResponse:
        """Process incoming payment gateway webhook, verify cryptographic signature, and activate 24h session."""
        # Phase 1: Precondition Gate
        if isinstance(payload, PayOSWebhookPayload):
            data = payload.data
            signature = payload.signature
            response_code = payload.code
        elif isinstance(payload, dict):
            data = payload.get("data", {})
            signature = payload.get("signature", "")
            response_code = payload.get("code")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook payload format.",
            )

        if not isinstance(data, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PayOS webhook data.",
            )

        if response_code != "00" or data.get("code") != "00":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PayOS webhook does not report a successful payment.",
            )

        if not self.verify_payos_webhook_signature(data, signature):
            logger.warning("INVALID_WEBHOOK_SIGNATURE: Webhook signature mismatch.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="INVALID_WEBHOOK_SIGNATURE: Cryptographic HMAC signature mismatch.",
            )

        # Phase 2: Locate transaction record
        order_code = data.get("orderCode")
        txn = (
            self.transaction_repo.find_by_reference(str(order_code))
            if order_code is not None
            else None
        )

        if not txn:
            ref_info = f"orderCode={data.get('orderCode')}, description={data.get('description')}"
            logger.warning("Webhook transaction not found for %s", ref_info)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction not found for payment reference ({ref_info}).",
            )

        try:
            paid_amount = Decimal(str(data.get("amount", "0")))
        except (ArithmeticError, ValueError):
            paid_amount = Decimal("0")
        try:
            is_payment_mismatch = (
                txn.payment_gateway != "PAYOS"
                or txn.gateway_transaction_id != str(order_code)
                or paid_amount != Decimal(str(txn.pay_amount))
                or data.get("currency", txn.currency) != txn.currency
            )
        except (ArithmeticError, ValueError):
            is_payment_mismatch = True
        if is_payment_mismatch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PayOS payment details do not match the checkout order.",
            )

        # Phase 3: Linear State Resolution & Unified Exit Accumulator
        if txn.status == "PAID":
            logger.info(
                "Transaction '%s' already marked as PAID (idempotent duplicate webhook).",
                txn.transaction_id,
            )
            session = txn.session
            response = WebhookResponse(
                success=True,
                message="Transaction already processed (idempotent)",
                order_id=txn.transaction_id,
                session_code=session.SessionCode if session else None,
                session_token=session.SessionToken if session else None,
                expires_at=session.Expire_at if session else None,
            )
        else:
            if txn.status != "PENDING":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="PayOS order is not awaiting payment.",
                )
            saved_lang = None
            if txn.gateway_payload and isinstance(txn.gateway_payload, dict):
                saved_lang = txn.gateway_payload.get("preferred_language")
            webhook_language = (
                saved_lang or getattr(txn, "preferred_language", None) or "vi"
            )
            webhook_language = webhook_language.strip().lower()
            if webhook_language not in SUPPORTED_LANGUAGES:
                webhook_language = "vi"

            updated_txn, session = self.transaction_repo.mark_as_paid(
                transaction_id=txn.transaction_id,
                preferred_language=webhook_language,
                gateway_transaction_id=str(order_code),
            )
            logger.info(
                "Transaction '%s' successfully marked as PAID via webhook. Session '%s' activated.",
                updated_txn.transaction_id,
                session.SessionCode,
            )
            response = WebhookResponse(
                success=True,
                message="Session activated successfully",
                order_id=updated_txn.transaction_id,
                session_code=session.SessionCode,
                session_token=session.SessionToken,
                expires_at=session.Expire_at,
            )

        return response
