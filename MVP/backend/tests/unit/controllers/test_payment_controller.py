"""Unit tests for PaymentController (US 06.1, US 06.2)."""

import hashlib
import hmac

from app.core.config import settings


def _generate_sig(data: dict, checksum_key: str) -> str:
    sorted_keys = sorted(data.keys())
    sign_string = "&".join(f"{k}={data[k]}" for k in sorted_keys if data[k] is not None)
    return hmac.new(
        checksum_key.encode("utf-8"),
        sign_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def test_should_create_checkout_order_for_vietqr(client, db_session):
    payload = {"payment_method": "VIETQR", "preferred_language": "vi"}
    response = client.post("/api/v1/payments/create-checkout", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "order_id" in data
    assert data["order_id"].startswith("TXN_")
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
    assert data["session_code"] is None


def test_should_simulate_payment_success_and_activate_session(client, db_session):
    # Step 1: Create order
    create_res = client.post(
        "/api/v1/payments/create-checkout",
        json={"payment_method": "VIETQR", "preferred_language": "vi"},
    )
    order_id = create_res.json()["order_id"]

    # Step 2: Simulate payment confirmation
    sim_res = client.post(f"/api/v1/payments/order/{order_id}/simulate-success")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["status"] == "PAID"
    assert sim_data["session_code"] is not None
    assert sim_data["session_code"].startswith("CCT-")
    assert sim_data["session_token"] is not None
    assert sim_data["paid_at"] is not None

    # Step 3: Verify GET status returns PAID and session info
    verify_res = client.get(f"/api/v1/payments/order/{order_id}/status")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "PAID"
    assert verify_data["session_code"] == sim_data["session_code"]


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
    data = {
        "order_id": order_id,
        "amount": 50000,
        "description": f"CCT {order_id[-6:]}",
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
    assert res_data["session_code"].startswith("CCT-")
    assert res_data["session_token"] is not None
    assert res_data["expires_at"] is not None


def test_should_reject_webhook_with_invalid_signature_401(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "PAYOS_CHECKSUM_KEY", "test_key")
    payload = {
        "code": "00",
        "desc": "success",
        "data": {"orderCode": 12345},
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

    data = {"order_id": order_id, "amount": 50000}
    sig = _generate_sig(data, test_key)
    payload = {"code": "00", "desc": "success", "data": data, "signature": sig}

    # Delivery 1
    res1 = client.post("/api/v1/payments/webhook", json=payload)
    assert res1.status_code == 200
    session_code = res1.json()["session_code"]

    # Delivery 2 (Idempotent duplicate)
    res2 = client.post("/api/v1/payments/webhook", json=payload)
    assert res2.status_code == 200
    assert res2.json()["success"] is True
    assert res2.json()["session_code"] == session_code
    assert "idempotent" in res2.json()["message"].lower()
