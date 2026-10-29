"""Pydantic schemas for Payment Gateway, Digital Checkout, and Webhook Activation (US 06.1, US 06.2)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class CheckoutCreateRequest(BaseModel):
    """Payload to initiate a digital admission checkout order."""

    payment_method: Literal["VIETQR", "CARD"] = Field(
        default="VIETQR",
        description="Selected payment method: VIETQR for domestic banking or CARD for international credit/debit.",
    )
    preferred_language: str = Field(
        default="vi",
        description="Preferred language code for the visitor pass.",
    )


class CheckoutCreateResponse(BaseModel):
    """Response returned upon checkout order initialization."""

    order_id: str = Field(..., description="Unique transaction/order identifier.")
    pay_amount: int = Field(..., description="Service fee amount.")
    amount: int | None = Field(default=None, description="Alias for pay_amount.")
    currency: str = Field(default="VND", description="Currency code (e.g., VND).")
    payment_method: str = Field(..., description="Payment method: VIETQR or CARD.")
    qr_code_url: str | None = Field(
        default=None,
        description="Direct URL to rendered high-resolution VietQR image.",
    )
    checkout_url: str | None = Field(
        default=None,
        description="Hosted checkout URL (for Stripe international card payments).",
    )
    transfer_bank: str | None = Field(
        default=None,
        description="Receiving bank name for VietQR domestic transfers.",
    )
    bank_name: str | None = Field(
        default=None,
        description="Alias for transfer_bank.",
    )
    transfer_account: str | None = Field(
        default=None,
        description="Receiving bank account number.",
    )
    account_no: str | None = Field(
        default=None,
        description="Alias for transfer_account.",
    )
    transfer_account_name: str | None = Field(
        default=None,
        description="Receiving bank account holder name.",
    )
    account_name: str | None = Field(
        default=None,
        description="Alias for transfer_account_name.",
    )
    transfer_content: str | None = Field(
        default=None,
        description="Mandatory transfer reference/memo syntax.",
    )
    payment_reference: str | None = Field(
        default=None,
        description="Alias for transfer_content.",
    )
    status: str = Field(
        default="PENDING",
        description="Order status: PENDING, PAID, EXPIRED, FAILED.",
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Expiration timestamp for the QR payment window.",
    )


class OrderStatusResponse(BaseModel):
    """Response returned when polling order status."""

    order_id: str = Field(..., description="Unique transaction/order identifier.")
    status: str = Field(
        ..., description="Current status: PENDING, PAID, EXPIRED, FAILED."
    )
    pay_amount: int = Field(..., description="Service fee amount.")
    amount: int | None = Field(default=None, description="Alias for pay_amount.")
    currency: str = Field(default="VND", description="Currency code.")
    paid_at: datetime | None = Field(
        default=None,
        description="Timestamp when payment was confirmed.",
    )
    session_code: str | None = Field(
        default=None,
        description="Issued 24-hour session code (e.g. CCT-XXXXXX) when paid.",
    )
    session_token: str | None = Field(
        default=None,
        description="Session token granting audio streaming decryption when paid.",
    )
    session_expires_at: datetime | None = Field(
        default=None,
        description="Expiration timestamp of the 24-hour visitor session.",
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Direct alias for session_expires_at for seamless frontend consumption.",
    )


class PayOSWebhookData(BaseModel):
    """Inner data payload delivered by PayOS webhook."""

    orderCode: int | None = Field(default=None, description="Numeric order code.")
    amount: int | None = Field(default=None, description="Transaction amount paid.")
    description: str | None = Field(
        default=None, description="Transfer memo/description."
    )
    accountNumber: str | None = Field(default=None, description="Bank account number.")
    reference: str | None = Field(
        default=None, description="Transaction reference code."
    )
    transactionDateTime: str | None = Field(
        default=None, description="Transaction timestamp."
    )
    currency: str | None = Field(default="VND", description="Currency code.")
    paymentLinkId: str | None = Field(
        default=None, description="PayOS payment link ID."
    )
    code: str | None = Field(
        default=None, description="PayOS transaction status code ('00' = success)."
    )
    desc: str | None = Field(
        default=None, description="PayOS transaction status message."
    )
    order_id: str | None = Field(
        default=None, description="Optional direct order identifier."
    )

    model_config = {"extra": "allow"}


class PayOSWebhookPayload(BaseModel):
    """Full PayOS webhook payload envelope."""

    code: str = Field(default="00", description="Overall response code.")
    desc: str = Field(default="success", description="Overall description.")
    data: dict[str, Any] = Field(
        ...,
        description="Inner transaction data object used for HMAC-SHA256 signature.",
    )
    signature: str = Field(
        ..., description="Cryptographic HMAC-SHA256 signature for verification."
    )

    model_config = {"extra": "allow"}


class WebhookResponse(BaseModel):
    """Standardized response returned to payment gateway upon webhook ingestion."""

    success: bool = Field(
        default=True, description="Whether webhook was processed successfully."
    )
    message: str = Field(
        default="Webhook processed successfully", description="Status message."
    )
    order_id: str | None = Field(
        default=None, description="Associated transaction order ID."
    )
    session_code: str | None = Field(
        default=None, description="Issued 24-hour session code."
    )
    session_token: str | None = Field(default=None, description="Issued session token.")
    expires_at: datetime | None = Field(
        default=None, description="Session expiration timestamp."
    )
