"""Unit tests for PaymentController (US 06.1, US 06.2)."""

import hashlib
import hmac
from unittest.mock import MagicMock

from app.core.config import settings
from app.core.dependencies import get_payment_service
from app.main import app
from app.models.transaction import Transaction


def _generate_sig(data: dict, checksum_key: str) -> str:
    sorted_keys = sorted(data.keys())
    sign_string = "&".join(f"{k}={data[k]}" for k in sorted_keys if data[k] is not None)
    return hmac.new(
        checksum_key.encode("utf-8"),
        sign_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _set_payos_order_code(db_session, order_id: str, order_code: str) -> None:
    txn = db_session.query(Transaction).filter_by(transaction_id=order_id).one()
    txn.gateway_transaction_id = order_code
    db_session.commit()


def test_should_create_checkout_order_for_vietqr(client, db_session):
    payload = {"payment_method": "VIETQR", "preferred_language": "vi"}
    response = client.post("/api/v1/payments/create-checkout", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "order_id" in data
    assert data["order_id"].startswith("TXN_")
    assert len(data["creator_token"]) >= 40
    assert data["pay_amount"] == 50000
    assert data["currency"] == "VND"
    assert data["payment_method"] == "VIETQR"
    assert data["qr_code_url"] is not None
    assert "vietqr.io" in data["qr_code_url"] or "payos" in data["qr_code_url"]
    assert data["transfer_content"] is not None
    assert data["status"] == "PENDING"


def test_should_create_checkout_order_for_card(client, db_session):
    payload = {"payment_method": "CARD", "preferred_language": "en"}
    response = client.post("/api/v1/payments/create-checkout", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "order_id" in data
    assert data["payment_method"] == "CARD"
    assert data["checkout_url"] is not None
    assert "paypal" in data["checkout_url"].lower()
    assert data["status"] == "PENDING"


def test_should_get_order_status_pending(client, db_session):
    # Step 1: Create order
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "VIETQR"},
    )
    assert create_res.status_code == 201
    order_id = create_res.json()["order_id"]

    # Step 2: Query status
    status_res = client.get(f"/api/v1/payments/order/{order_id}/status")
    assert status_res.status_code == 200
    data = status_res.json()
    assert data["order_id"] == order_id
    assert data["status"] == "PENDING"
    assert "session_code" not in data
    assert "session_token" not in data


def test_should_simulate_payment_success_and_activate_session(client, db_session):
    # Step 1: Create order
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "VIETQR", "preferred_language": "vi"},
    )
    order_id = create_res.json()["order_id"]
    creator_token = create_res.json()["creator_token"]

    # Step 2: Simulate payment confirmation
    sim_res = client.post(f"/api/v1/payments/order/{order_id}/simulate-success")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["status"] == "PAID"
    assert sim_data["session_code"] is not None
    assert sim_data["session_code"].startswith("CCT-")
    assert sim_data["session_token"] is not None
    assert sim_data["paid_at"] is not None

    # Step 3: Public polling exposes payment state only.
    verify_res = client.get(f"/api/v1/payments/order/{order_id}/status")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "PAID"
    assert "session_code" not in verify_data
    assert "session_token" not in verify_data

    # The checkout capability is required to retrieve session credentials.
    exchange_res = client.post(
        f"/api/v1/payments/order/{order_id}/session",
        json={"creator_token": creator_token},
    )
    assert exchange_res.status_code == 200
    assert exchange_res.json()["session_code"] == sim_data["session_code"]
    assert exchange_res.json()["session_token"] == sim_data["session_token"]


def test_should_return_404_when_querying_unknown_order(client, db_session):
    response = client.get("/api/v1/payments/order/TXN_DOES_NOT_EXIST/status")
    assert response.status_code == 404


def test_should_handle_webhook_success_and_activate_session(
    client, db_session, monkeypatch
):
    test_key = "test_webhook_secret_key"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    # 1. Create order
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "VIETQR", "preferred_language": "vi"},
    )
    order_id = create_res.json()["order_id"]

    # 2. Call Webhook
    _set_payos_order_code(db_session, order_id, "123456")
    data = {
        "orderCode": 123456,
        "amount": 50000,
        "description": f"CCT {order_id[-6:]}",
        "code": "00",
    }
    sig = _generate_sig(data, test_key)
    payload = {
        "code": "00",
        "desc": "success",
        "data": data,
        "signature": sig,
    }

    res = client.post("/api/v1/payments/webhook", json=payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["order_id"] == order_id
    assert "session_code" not in res_data
    assert "session_token" not in res_data
    assert "expires_at" not in res_data


def test_should_reject_webhook_with_invalid_signature_401(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", "test_key")
    payload = {
        "code": "00",
        "desc": "success",
        "data": {"orderCode": 12345, "code": "00"},
        "signature": "bad_signature_hex",
    }
    res = client.post("/api/v1/payments/webhook", json=payload)
    assert res.status_code == 401
    body = res.json()
    error_msg = (
        body.get("error", {}).get("message", "")
        if "error" in body
        else body.get("detail", "")
    )
    assert "INVALID_WEBHOOK_SIGNATURE" in error_msg


def test_should_handle_idempotent_duplicate_webhook(client, db_session, monkeypatch):
    test_key = "test_webhook_secret_key"
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", test_key)

    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "VIETQR"},
    )
    order_id = create_res.json()["order_id"]

    _set_payos_order_code(db_session, order_id, "123457")
    data = {"orderCode": 123457, "amount": 50000, "code": "00"}
    sig = _generate_sig(data, test_key)
    payload = {"code": "00", "desc": "success", "data": data, "signature": sig}

    # Delivery 1
    res1 = client.post("/api/v1/payments/webhook", json=payload)
    assert res1.status_code == 200
    assert "session_code" not in res1.json()

    # Delivery 2 (Idempotent duplicate)
    res2 = client.post("/api/v1/payments/webhook", json=payload)
    assert res2.status_code == 200
    assert res2.json()["success"] is True
    assert "session_code" not in res2.json()
    assert "idempotent" in res2.json()["message"].lower()


def test_should_render_paypal_mock_checkout_page(client, db_session):
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "CARD"},
    )
    order_id = create_res.json()["order_id"]

    res = client.get(f"/api/v1/payments/paypal-checkout?order_id={order_id}")
    assert res.status_code == 200
    assert "PayPal" in res.text
    assert order_id in res.text
    assert (
        f'href="/api/v1/payments/paypal/confirm-mock?order_id={order_id}"' in res.text
    )


def test_should_reject_html_order_id_before_rendering_checkout(monkeypatch):
    from fastapi.testclient import TestClient

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    payment_service = MagicMock()
    monkeypatch.setitem(
        app.dependency_overrides,
        get_payment_service,
        lambda: payment_service,
    )

    with TestClient(app) as test_client:
        response = test_client.get(
            "/api/v1/payments/paypal-checkout",
            params={"order_id": "<script>alert(1)</script>"},
        )

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/json")
    payment_service.simulate_payment_success.assert_not_called()


def test_should_confirm_paypal_mock_payment_and_redirect(client, db_session):
    from app.models.session import VisitorSession

    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "CARD", "preferred_language": "ja"},
    )
    order_id = create_res.json()["order_id"]
    creator_token = create_res.json()["creator_token"]

    res = client.get(
        f"/api/v1/payments/paypal/confirm-mock?order_id={order_id}",
        follow_redirects=False,
    )
    assert res.status_code == 302
    location = res.headers["location"]
    assert "payment_success=true" in location
    assert f"order_id={order_id}" in location
    assert "session_token" not in location

    status_res = client.get(f"/api/v1/payments/order/{order_id}/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "PAID"
    assert "session_code" not in status_data
    session_res = client.post(
        f"/api/v1/payments/order/{order_id}/session",
        json={"creator_token": creator_token},
    )
    assert session_res.status_code == 200
    session_data = session_res.json()

    sess = (
        db_session.query(VisitorSession)
        .filter(VisitorSession.SessionCode == session_data["session_code"])
        .first()
    )
    assert sess is not None
    assert sess.PreferredLanguage == "ja"


def test_should_not_capture_paypal_order_without_gateway_credentials(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", "")
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", "")
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "CARD"},
    )
    order_id = create_res.json()["order_id"]

    cap_res = client.post(
        f"/api/v1/payments/order/{order_id}/paypal-capture",
        json={
            "paypal_order_id": "PAYPAL-ORDER",
            "creator_token": create_res.json()["creator_token"],
        },
    )
    assert cap_res.status_code == 503
    txn = db_session.query(Transaction).filter_by(transaction_id=order_id).one()
    assert txn.status == "PENDING"


def test_should_disable_mock_payment_routes_outside_development(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "VIETQR"},
    )
    order_id = create_res.json()["order_id"]

    simulation_res = client.post(f"/api/v1/payments/order/{order_id}/simulate-success")
    mock_checkout_res = client.get(
        f"/api/v1/payments/paypal-checkout?order_id={order_id}"
    )
    mock_confirm_res = client.get(
        f"/api/v1/payments/paypal/confirm-mock?order_id={order_id}"
    )

    assert simulation_res.status_code == 404
    assert mock_checkout_res.status_code == 404
    assert mock_confirm_res.status_code == 404


def test_mock_routes_are_disabled_without_database_outside_development(monkeypatch):
    from fastapi.testclient import TestClient

    order_id = "TXN_0123456789AB"
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    payment_service = MagicMock()
    monkeypatch.setitem(
        app.dependency_overrides,
        get_payment_service,
        lambda: payment_service,
    )

    with TestClient(app) as test_client:
        simulation_res = test_client.post(
            f"/api/v1/payments/order/{order_id}/simulate-success"
        )
        checkout_res = test_client.get(
            f"/api/v1/payments/paypal-checkout?order_id={order_id}"
        )
        confirm_res = test_client.get(
            f"/api/v1/payments/paypal/confirm-mock?order_id={order_id}"
        )

    assert simulation_res.status_code == 404
    assert checkout_res.status_code == 404
    assert confirm_res.status_code == 404
    payment_service.simulate_payment_success.assert_not_called()


def test_mock_paypal_redirect_does_not_expose_session_token(monkeypatch):
    from fastapi.testclient import TestClient

    order_id = "TXN_0123456789AB"
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    payment_service = MagicMock()
    payment_service.simulate_payment_success.return_value.session_token = (
        "sensitive-session-token"
    )
    monkeypatch.setitem(
        app.dependency_overrides,
        get_payment_service,
        lambda: payment_service,
    )

    with TestClient(app) as test_client:
        response = test_client.get(
            f"/api/v1/payments/paypal/confirm-mock?order_id={order_id}",
            follow_redirects=False,
        )

    assert response.status_code == 302
    assert "sensitive-session-token" not in response.headers["location"]
