"""TransactionRepository encapsulating SQLAlchemy ORM data access for Transaction (US 06.1)."""

import uuid
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.session import VisitorSession
from app.models.transaction import Transaction


class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_transaction(
        self,
        pay_amount: int,
        payment_gateway: str,
        payment_method: str = "VIETQR",
        currency: str = "VND",
        gateway_transaction_id: str | None = None,
        gateway_payload: dict[str, Any] | None = None,
        transaction_id: str | None = None,
    ) -> Transaction:
        """Create and persist a new PENDING transaction record."""
        txn_id = transaction_id or f"TXN_{uuid.uuid4().hex[:12].upper()}"
        txn = Transaction(
            transaction_id=txn_id,
            pay_amount=pay_amount,
            currency=currency,
            payment_gateway=payment_gateway,
            payment_method=payment_method,
            status="PENDING",
            gateway_transaction_id=gateway_transaction_id,
            gateway_payload=gateway_payload,
            create_at=func.now(),
        )
        self.db.add(txn)
        self.db.commit()
        self.db.refresh(txn)
        return txn

    def get_by_id(self, transaction_id: str) -> Transaction | None:
        """Retrieve a transaction by primary key identifier with session loaded."""
        return (
            self.db.query(Transaction)
            .options(joinedload(Transaction.session))
            .filter(Transaction.transaction_id == transaction_id)
            .first()
        )

    def mark_as_paid(
        self,
        transaction_id: str,
        preferred_language: str = "vi",
        gateway_transaction_id: str | None = None,
    ) -> tuple[Transaction, VisitorSession]:
        """Atomically transition transaction to PAID and create 24h VisitorSession."""
        txn = self.get_by_id(transaction_id)
        if not txn:
            raise ValueError(f"Transaction '{transaction_id}' not found.")

        # Create or reuse active visitor session
        if not txn.session:
            session_id = f"SES_{uuid.uuid4().hex[:12].upper()}"
            session_code = f"CCT-{uuid.uuid4().hex[:6].upper()}"
            session_token = uuid.uuid4().hex

            session = VisitorSession(
                SessionID=session_id,
                SessionCode=session_code,
                SessionToken=session_token,
                Status="ACTIVE",
                PreferredLanguage=preferred_language,
                Activate_at=func.now(),
            )
            self.db.add(session)
            self.db.flush()
            txn.session_id = session.SessionID
        else:
            session = txn.session

        txn.status = "PAID"
        txn.paid_at = func.now()
        if gateway_transaction_id:
            txn.gateway_transaction_id = gateway_transaction_id

        self.db.commit()
        self.db.refresh(txn)
        self.db.refresh(session)
        return txn, session
