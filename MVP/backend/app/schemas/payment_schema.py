"""Pydantic schemas for Payment Gateway and Digital Checkout (US 06.1)."""

from datetime import datetime
from typing import Literal

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
    transfer_account: str | None = Field(
        default=None,
        description="Receiving bank account number.",
    )
    transfer_account_name: str | None = Field(
        default=None,
        description="Receiving bank account holder name.",
    )
    transfer_content: str | None = Field(
        default=None,
        description="Mandatory transfer reference/memo syntax.",
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
    status: str = Field(..., description="Current status: PENDING, PAID, EXPIRED, FAILED.")
    pay_amount: int = Field(..., description="Service fee amount.")
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
