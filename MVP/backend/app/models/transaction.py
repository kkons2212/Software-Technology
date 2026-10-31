"""SQLAlchemy model for Transaction table (US 06.1)."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "Transaction"

    transaction_id: Mapped[str] = mapped_column(
        "TransactionID", String(20), primary_key=True, index=True
    )
    pay_amount: Mapped[Decimal] = mapped_column(
        "PayAmount", Numeric(12, 2), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        "Currency", String(3), nullable=False, default="VND"
    )
    payment_gateway: Mapped[str] = mapped_column(
        "PaymentGateway", String(255), nullable=False
    )
    payment_method: Mapped[str | None] = mapped_column(
        "PaymentMethod", String(255), nullable=True
    )
    status: Mapped[str] = mapped_column(
        "Status", String(255), nullable=False, default="PENDING", index=True
    )
    gateway_transaction_id: Mapped[str | None] = mapped_column(
        "GatewayTransactionID", String(255), nullable=True
    )
    gateway_payload: Mapped[dict[str, Any] | None] = mapped_column(
        "GatewayPayload", JSON, nullable=True
    )
    paid_at: Mapped[datetime | None] = mapped_column("Paid_at", DateTime, nullable=True)
    create_at: Mapped[datetime] = mapped_column(
        "Create_at", DateTime, nullable=False, default=func.now()
    )

    # Synonyms for exact PascalCase column names matching MySQL schema DDL
    TransactionID = synonym("transaction_id")
    PayAmount = synonym("pay_amount")
    Currency = synonym("currency")
    PaymentGateway = synonym("payment_gateway")
    PaymentMethod = synonym("payment_method")
    Status = synonym("status")
    GatewayTransactionID = synonym("gateway_transaction_id")
    GatewayPayload = synonym("gateway_payload")
    Paid_at = synonym("paid_at")
    Create_at = synonym("create_at")

    # Relationship to visitor session (VisitorSession.TransactionID -> Transaction.TransactionID)
    session = relationship(
        "VisitorSession", back_populates="transaction", uselist=False
    )

    @property
    def session_id(self) -> str | None:
        """Backward compatibility alias."""
        return self.session.session_id if self.session else None
