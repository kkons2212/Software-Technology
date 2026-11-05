"""Unit tests for PaymentService and Webhook Activation (US 06.2 & Task REF-06.5)."""

import hashlib
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.models.session import VisitorSession
from app.models.transaction import Transaction
from app.repositories.session_repository import SessionRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.payment_schema import (
    CheckoutCreateRequest,
    OrderSessionRequest,
    PayOSWebhookPayload,
)
from app.services.payment_service import PaymentService

TEST_CREATOR_TOKEN = "test-order-creator-capability-token-123456"
TEST_CREATOR_TOKEN_HASH = hashlib.sha256(TEST_CREATOR_TOKEN.encode("utf-8")).hexdigest()


@pytest.fixture
def mock_tx_repo():
    return MagicMock(spec=TransactionRepository)


@pytest.fixture
def mock_sess_repo():
    return MagicMock(spec=SessionRepository)


@pytest.fixture
def mock_payment_service(mock_tx_repo, mock_sess_repo):
    return PaymentService(transaction_repo=mock_tx_repo, session_repo=mock_sess_repo)


@pytest.fixture
def payment_service(db_session):
    tx_repo = TransactionRepository(db_session)
    sess_repo = SessionRepository(db_session)
    return PaymentService(transaction_repo=tx_repo, session_repo=sess_repo)


# ==============================================================================
# Isolated Unit Tests (AAA Structure, SISE Validation)
# ==============================================================================


def test_verify_payos_webhook_signature_valid_and_invalid(
    mock_payment_service, monkeypatch
):
    test_key = "test_checksum_key_secret_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    data = {
        "orderCode": 123456,
        "amount": 50000,
        "description": "CCT 894201",
    }
    valid_sig = mock_payment_service._generate_payos_signature(data, test_key)

    # Valid signature
    assert mock_payment_service.verify_payos_webhook_signature(data, valid_sig) is True

    # Tampered data
    tampered_data = {**data, "amount": 10000}
    assert (
        mock_payment_service.verify_payos_webhook_signature(tampered_data, valid_sig)
        is False
    )

    # Invalid signature string
    assert (
        mock_payment_service.verify_payos_webhook_signature(data, "invalid_sig_abc")
        is False
    )

    # Empty key
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", "")
    assert mock_payment_service.verify_payos_webhook_signature(data, valid_sig) is False


def test_process_payment_webhook_invalid_signature_raises_401(
    mock_payment_service, monkeypatch
):
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", "secret_key_123")
    payload = {
        "code": "00",
        "desc": "success",
        "data": {"orderCode": 999999, "amount": 50000, "code": "00"},
        "signature": "forged_signature_hex",
    }

    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.process_payment_webhook(payload)
    assert exc_info.value.status_code == 401
    assert "INVALID_WEBHOOK_SIGNATURE" in exc_info.value.detail


def test_process_payment_webhook_not_found_raises_404(
    mock_payment_service, mock_tx_repo, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)
    mock_tx_repo.find_by_reference.return_value = None

    data = {
        "orderCode": 888888,
        "amount": 50000,
        "description": "NON_EXISTENT",
        "code": "00",
    }
    sig = mock_payment_service._generate_payos_signature(data, test_key)
    payload = {"code": "00", "desc": "success", "data": data, "signature": sig}

    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.process_payment_webhook(payload)
    assert exc_info.value.status_code == 404


def test_mock_process_payment_webhook_success(
    mock_payment_service, mock_tx_repo, mock_sess_repo, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    fake_txn = Transaction(
        transaction_id="TXN_WEBHOOK1",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYOS",
        payment_method="VIETQR",
        status="PENDING",
        gateway_transaction_id="123456",
    )
    mock_tx_repo.find_by_reference.return_value = fake_txn

    now = datetime.utcnow()
    fake_session = VisitorSession(
        SessionID="SES_WEBHOOK1",
        SessionCode="CCT-WH0001",
        SessionToken="mock_token_webhook",
        Status="ACTIVE",
        Activate_at=now,
        Expire_at=now + timedelta(hours=24),
    )
    mock_sess_repo.create_session.return_value = fake_session
    mock_sess_repo.ensure_session_token.return_value = "mock_token_webhook"
    mock_tx_repo.mark_as_paid.return_value = (fake_txn, fake_session)

    data = {
        "orderCode": 123456,
        "amount": 50000,
        "description": "CCT WH0001",
        "code": "00",
    }
    sig = mock_payment_service._generate_payos_signature(data, test_key)
    payload = {"code": "00", "desc": "success", "data": data, "signature": sig}

    res = mock_payment_service.process_payment_webhook(payload)

    assert res.success is True
    assert res.order_id == "TXN_WEBHOOK1"
    assert not hasattr(res, "session_code")
    assert not hasattr(res, "session_token")
    mock_tx_repo.mark_as_paid.assert_called_once_with(
        transaction_id="TXN_WEBHOOK1",
        preferred_language="vi",
        gateway_transaction_id="123456",
    )


def test_mock_process_payment_webhook_idempotent(
    mock_payment_service, mock_tx_repo, mock_sess_repo, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    now = datetime.utcnow()
    existing_session = VisitorSession(
        SessionID="SES_EXISTING",
        SessionCode="CCT-EXIST1",
        SessionToken="existing_token",
        Status="ACTIVE",
        Activate_at=now - timedelta(hours=2),
        Expire_at=now + timedelta(hours=22),
    )
    fake_paid_txn = Transaction(
        transaction_id="TXN_PAID_ALREADY",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYOS",
        payment_method="VIETQR",
        status="PAID",
        gateway_transaction_id="999000",
        session=existing_session,
    )
    mock_tx_repo.find_by_reference.return_value = fake_paid_txn
    mock_sess_repo.ensure_session_token.return_value = "existing_token"

    data = {
        "orderCode": 999000,
        "amount": 50000,
        "description": "CCT EXIST1",
        "code": "00",
    }
    sig = mock_payment_service._generate_payos_signature(data, test_key)
    payload = {"code": "00", "desc": "success", "data": data, "signature": sig}

    res = mock_payment_service.process_payment_webhook(payload)

    assert res.success is True
    assert "idempotent" in res.message.lower()
    assert res.order_id == "TXN_PAID_ALREADY"
    assert not hasattr(res, "session_code")
    assert not hasattr(res, "session_token")
    assert mock_sess_repo.create_session.call_count == 0
    assert mock_tx_repo.mark_as_paid.call_count == 0


def test_process_payment_webhook_rejects_unsuccessful_payment_status(
    mock_payment_service, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)
    data = {"orderCode": 123456, "amount": 50000, "code": "01"}
    signature = mock_payment_service._generate_payos_signature(data, test_key)

    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.process_payment_webhook(
            {"code": "00", "data": data, "signature": signature}
        )

    assert exc_info.value.status_code == 400


def test_process_payment_webhook_rejects_amount_mismatch(
    mock_payment_service, mock_tx_repo, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)
    mock_tx_repo.find_by_reference.return_value = Transaction(
        transaction_id="TXN_WEBHOOK1",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYOS",
        payment_method="VIETQR",
        status="PENDING",
        gateway_transaction_id="123456",
    )
    data = {"orderCode": 123456, "amount": 10000, "code": "00"}
    signature = mock_payment_service._generate_payos_signature(data, test_key)

    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.process_payment_webhook(
            {"code": "00", "data": data, "signature": signature}
        )

    assert exc_info.value.status_code == 400
    mock_tx_repo.mark_as_paid.assert_not_called()


@pytest.mark.asyncio
async def test_capture_paypal_order_activates_session_only_after_verified_capture(
    mock_payment_service, mock_tx_repo, mocker, monkeypatch
):
    from app.integrations.paypal_client import paypal_client

    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", "sandbox-client")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", "sandbox-secret")
    monkeypatch.setattr(settings, "PAYPAL_CURRENCY", "USD")
    monkeypatch.setattr(settings, "PAYPAL_EXCHANGE_RATE", 25000.0)
    txn = Transaction(
        transaction_id="TXN_PAYPAL1",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYPAL",
        payment_method="CARD",
        status="PENDING",
        gateway_transaction_id="PAYPAL-ORDER-1",
        gateway_payload={
            "preferred_language": "en",
            "creator_token_hash": TEST_CREATOR_TOKEN_HASH,
        },
    )
    mock_tx_repo.get_by_id.return_value = txn
    now = datetime.utcnow()
    session = VisitorSession(
        SessionID="SES_PAYPAL1",
        SessionCode="CCT-PP0001",
        SessionToken="paypal-session-token",
        Status="ACTIVE",
        Activate_at=now,
        Expire_at=now + timedelta(hours=24),
    )
    updated_txn = Transaction(
        transaction_id="TXN_PAYPAL1",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYPAL",
        payment_method="CARD",
        status="PAID",
        gateway_transaction_id="PAYPAL-CAPTURE-1",
    )
    mock_tx_repo.mark_as_paid.return_value = (updated_txn, session)
    capture = {
        "status": "COMPLETED",
        "purchase_units": [
            {
                "reference_id": "TXN_PAYPAL1",
                "payments": {
                    "captures": [
                        {
                            "id": "PAYPAL-CAPTURE-1",
                            "status": "COMPLETED",
                            "amount": {"currency_code": "USD", "value": "2.00"},
                        }
                    ]
                },
            }
        ],
    }
    capture_order = mocker.patch.object(
        paypal_client, "capture_order", new_callable=AsyncMock, return_value=capture
    )

    response = await mock_payment_service.capture_paypal_order(
        order_id="TXN_PAYPAL1",
        paypal_order_id="PAYPAL-ORDER-1",
        creator_token=TEST_CREATOR_TOKEN,
    )

    capture_order.assert_awaited_once_with("PAYPAL-ORDER-1")
    mock_tx_repo.mark_as_paid.assert_called_once_with(
        transaction_id="TXN_PAYPAL1",
        preferred_language="en",
        gateway_transaction_id="PAYPAL-CAPTURE-1",
    )
    assert response.status == "PAID"
    assert response.session_token == "paypal-session-token"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "capture_response",
    [
        {"status": "PENDING", "purchase_units": []},
        {
            "status": "COMPLETED",
            "purchase_units": [
                {
                    "reference_id": "TXN_PAYPAL1",
                    "payments": {
                        "captures": [
                            {
                                "id": "PAYPAL-CAPTURE-1",
                                "status": "COMPLETED",
                                "amount": {"currency_code": "USD", "value": "3.00"},
                            }
                        ]
                    },
                }
            ],
        },
    ],
)
async def test_capture_paypal_order_does_not_activate_when_capture_is_unsuccessful(
    mock_payment_service, mock_tx_repo, mocker, monkeypatch, capture_response
):
    from app.integrations.paypal_client import paypal_client

    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", "sandbox-client")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", "sandbox-secret")
    monkeypatch.setattr(settings, "PAYPAL_CURRENCY", "USD")
    monkeypatch.setattr(settings, "PAYPAL_EXCHANGE_RATE", 25000.0)
    mock_tx_repo.get_by_id.return_value = Transaction(
        transaction_id="TXN_PAYPAL1",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYPAL",
        payment_method="CARD",
        status="PENDING",
        gateway_transaction_id="PAYPAL-ORDER-1",
        gateway_payload={"creator_token_hash": TEST_CREATOR_TOKEN_HASH},
    )
    mocker.patch.object(
        paypal_client,
        "capture_order",
        new_callable=AsyncMock,
        return_value=capture_response,
    )

    with pytest.raises(HTTPException) as exc_info:
        await mock_payment_service.capture_paypal_order(
            order_id="TXN_PAYPAL1",
            paypal_order_id="PAYPAL-ORDER-1",
            creator_token=TEST_CREATOR_TOKEN,
        )

    assert exc_info.value.status_code == 402
    mock_tx_repo.mark_as_paid.assert_not_called()


@pytest.mark.asyncio
async def test_capture_paypal_order_rejects_foreign_paypal_order(
    mock_payment_service, mock_tx_repo, mocker, monkeypatch
):
    from app.integrations.paypal_client import paypal_client

    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", "sandbox-client")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", "sandbox-secret")
    mock_tx_repo.get_by_id.return_value = Transaction(
        transaction_id="TXN_PAYPAL1",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYPAL",
        payment_method="CARD",
        status="PENDING",
        gateway_transaction_id="PAYPAL-ORDER-1",
        gateway_payload={"creator_token_hash": TEST_CREATOR_TOKEN_HASH},
    )
    capture_order = mocker.patch.object(
        paypal_client, "capture_order", new_callable=AsyncMock
    )

    with pytest.raises(HTTPException) as exc_info:
        await mock_payment_service.capture_paypal_order(
            order_id="TXN_PAYPAL1",
            paypal_order_id="ANOTHER-ORDER",
            creator_token=TEST_CREATOR_TOKEN,
        )

    assert exc_info.value.status_code == 400
    capture_order.assert_not_awaited()
    mock_tx_repo.mark_as_paid.assert_not_called()


def test_simulate_payment_success_is_disabled_outside_development(
    mock_payment_service, mock_tx_repo, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.simulate_payment_success("TXN_TEST")

    assert exc_info.value.status_code == 404
    mock_tx_repo.get_by_id.assert_not_called()


def test_exchange_order_session_requires_creator_capability(
    mock_payment_service, mock_tx_repo
):
    now = datetime.utcnow()
    session = VisitorSession(
        SessionID="SES_EXCHANGE",
        SessionCode="CCT-" + "A" * 32,
        SessionToken="session-token",
        Status="ACTIVE",
        Activate_at=now,
        Expire_at=now + timedelta(hours=24),
    )
    txn = Transaction(
        transaction_id="TXN_EXCHANGE",
        pay_amount=50000,
        currency="VND",
        payment_gateway="PAYOS",
        status="PAID",
        gateway_payload={"creator_token_hash": TEST_CREATOR_TOKEN_HASH},
        session=session,
    )
    mock_tx_repo.get_by_id.return_value = txn

    response = mock_payment_service.exchange_order_session(
        "TXN_EXCHANGE", OrderSessionRequest(creator_token=TEST_CREATOR_TOKEN)
    )

    assert response.session_token == "session-token"
    assert response.session_code == "CCT-" + "A" * 32

    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.exchange_order_session(
            "TXN_EXCHANGE",
            OrderSessionRequest(
                creator_token="wrong-creator-capability-token-1234567890"
            ),
        )
    assert exc_info.value.status_code == 404

    txn.status = "PENDING"
    with pytest.raises(HTTPException) as exc_info:
        mock_payment_service.exchange_order_session(
            "TXN_EXCHANGE", OrderSessionRequest(creator_token=TEST_CREATOR_TOKEN)
        )
    assert exc_info.value.status_code == 409


# ==============================================================================
# Database-Integrated Tests (Executed in CI with live MySQL container)
# ==============================================================================


@pytest.mark.asyncio
async def test_process_payment_webhook_success_activates_session_and_idempotent(
    payment_service, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    # 1. Create a checkout order
    checkout_res = await payment_service.create_checkout_order(
        CheckoutCreateRequest(payment_method="VIETQR", preferred_language="vi")
    )
    order_id = checkout_res.order_id
    assert len(checkout_res.creator_token) >= 40
    order_record = payment_service.transaction_repo.get_by_id(order_id)
    assert (
        order_record.gateway_payload["creator_token_hash"]
        == hashlib.sha256(checkout_res.creator_token.encode("utf-8")).hexdigest()
    )
    assert checkout_res.creator_token not in str(order_record.gateway_payload)

    gateway_order_code = "777123"
    payment_service.transaction_repo.update_gateway_info(
        payment_service.transaction_repo.get_by_id(order_id), gateway_order_code
    )

    # 2. Prepare valid webhook payload referencing the PayOS order code
    data = {
        "orderCode": int(gateway_order_code),
        "amount": 50000,
        "description": f"CCT {order_id[-6:]}",
        "code": "00",
    }
    sig = payment_service._generate_payos_signature(data, test_key)
    payload = PayOSWebhookPayload(
        code="00",
        desc="success",
        data=data,
        signature=sig,
    )

    # 3. Process webhook first time
    res1 = payment_service.process_payment_webhook(payload)
    assert res1.success is True
    assert res1.order_id == order_id
    assert not hasattr(res1, "session_code")
    assert not hasattr(res1, "session_token")
    assert not hasattr(res1, "expires_at")

    # Verify transaction in database
    db_txn = payment_service.transaction_repo.get_by_id(order_id)
    assert db_txn.status == "PAID"
    assert db_txn.session is not None
    assert db_txn.session.SessionCode.startswith("CCT-")
    assert len(db_txn.session.SessionCode) == 36
    # 24h validity check
    diff = db_txn.session.Expire_at - datetime.utcnow()
    assert 23.9 <= diff.total_seconds() / 3600 <= 24.1

    # 4. Idempotent re-delivery of the same webhook
    res2 = payment_service.process_payment_webhook(payload)
    assert res2.success is True
    assert "idempotent" in res2.message.lower()
    assert res2.order_id == order_id
    assert not hasattr(res2, "session_code")
    assert not hasattr(res2, "session_token")


@pytest.mark.asyncio
async def test_process_payment_webhook_lookup_by_description_memo(
    payment_service, monkeypatch
):
    test_key = "secret_key_123"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    # Create checkout order
    checkout_res = await payment_service.create_checkout_order(
        CheckoutCreateRequest(payment_method="VIETQR", preferred_language="vi")
    )
    order_id = checkout_res.order_id
    memo = f"CCT {order_id[-6:]}"

    # Webhook contains description memo without explicit order_id
    gateway_order_code = "777124"
    payment_service.transaction_repo.update_gateway_info(
        payment_service.transaction_repo.get_by_id(order_id), gateway_order_code
    )
    data = {
        "orderCode": int(gateway_order_code),
        "amount": 50000,
        "description": memo,
        "code": "00",
    }
    sig = payment_service._generate_payos_signature(data, test_key)
    payload = {"code": "00", "desc": "success", "data": data, "signature": sig}

    res = payment_service.process_payment_webhook(payload)
    assert res.success is True
    assert res.order_id == order_id
    assert not hasattr(res, "session_code")


@pytest.mark.asyncio
async def test_create_checkout_order_card_fallback(payment_service):
    checkout_res = await payment_service.create_checkout_order(
        CheckoutCreateRequest(payment_method="CARD", preferred_language="en")
    )
    assert checkout_res.order_id.startswith("TXN_")
    assert checkout_res.payment_method == "CARD"
    assert "/api/v1/payments/paypal-checkout" in checkout_res.checkout_url


@pytest.mark.asyncio
async def test_create_checkout_order_fails_closed_without_paypal_in_production(
    mock_payment_service, mock_tx_repo, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", "")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", "")

    with pytest.raises(HTTPException) as exc_info:
        await mock_payment_service.create_checkout_order(
            CheckoutCreateRequest(payment_method="CARD", preferred_language="en")
        )

    assert exc_info.value.status_code == 503
    mock_tx_repo.create_transaction.assert_not_called()


@pytest.mark.asyncio
async def test_create_checkout_order_paypal_mocked_live(payment_service, monkeypatch):
    from app.integrations.paypal_client import paypal_client

    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", "mock_client_id")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", "mock_client_secret")

    async def mock_create_order(*args, **kwargs):
        return {
            "paypal_order_id": "PP-12345678",
            "approve_url": "https://www.sandbox.paypal.com/checkoutnow?token=PP-12345678",
            "amount_usd": "2.00",
            "status": "CREATED",
        }

    monkeypatch.setattr(paypal_client, "create_order", mock_create_order)

    checkout_res = await payment_service.create_checkout_order(
        CheckoutCreateRequest(payment_method="CARD", preferred_language="en")
    )
    assert (
        checkout_res.checkout_url
        == "https://www.sandbox.paypal.com/checkoutnow?token=PP-12345678"
    )
