"""SQLAlchemy model for VisitorSession table."""

import datetime
import uuid
from decimal import Decimal

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship, synonym

from app.core.database import Base


def get_default_expire_at():
    return datetime.datetime.utcnow() + datetime.timedelta(hours=24)


class VisitorSession(Base):
    __tablename__ = "VisitorSession"

    SessionID = Column(
        String(20), primary_key=True, default=lambda: uuid.uuid4().hex[:20]
    )
    SessionCode = Column(
        String(255),
        unique=True,
        nullable=False,
        default=lambda: uuid.uuid4().hex[:8].upper(),
    )
    SessionToken = Column(
        String(255), unique=True, nullable=False, default=lambda: uuid.uuid4().hex
    )
    DeviceFingerPrint = Column(String(255), nullable=True)
    Status = Column(String(255), nullable=False, default="ACTIVE")
    Activate_at = Column(DateTime, nullable=False, default=func.now())
    Expire_at = Column(DateTime, nullable=False, default=get_default_expire_at)
    Create_at = Column(DateTime, nullable=False, default=func.now())
    PreferredLanguage = Column(
        String(20), ForeignKey("LanguageCode.LanguageID"), nullable=False, default="vi"
    )
    TransactionID = Column(
        String(20),
        ForeignKey("Transaction.TransactionID", ondelete="RESTRICT"),
        nullable=False,
    )

    language = relationship("LanguageCode")
    transaction = relationship("Transaction", back_populates="session", cascade="all")
    triggers = relationship(
        "POITrigger", back_populates="session", cascade="all, delete-orphan"
    )

    # Synonyms for snake_case attribute access
    session_id = synonym("SessionID")
    session_code = synonym("SessionCode")
    session_token = synonym("SessionToken")
    device_fingerprint = synonym("DeviceFingerPrint")
    status = synonym("Status")
    activate_at = synonym("Activate_at")
    expire_at = synonym("Expire_at")
    create_at = synonym("Create_at")
    preferred_language = synonym("PreferredLanguage")
    transaction_id = synonym("TransactionID")

    def __init__(self, **kwargs):
        if (
            "transaction" not in kwargs
            and "TransactionID" not in kwargs
            and "transaction_id" not in kwargs
        ):
            from app.models.transaction import Transaction

            auto_txn_id = f"TXN_{uuid.uuid4().hex[:12].upper()}"
            kwargs["transaction"] = Transaction(
                transaction_id=auto_txn_id,
                pay_amount=Decimal("50000.00"),
                currency="VND",
                payment_gateway="MOCK",
                status="PAID",
                paid_at=datetime.datetime.utcnow(),
            )
            kwargs["TransactionID"] = auto_txn_id
        elif "TransactionID" in kwargs and "transaction" not in kwargs:
            # If TransactionID provided but not transaction object, ensure compatibility
            kwargs.setdefault("transaction_id", kwargs["TransactionID"])
        super().__init__(**kwargs)
