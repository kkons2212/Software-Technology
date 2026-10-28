"""Unit tests for PaymentController (US 06.1)."""


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
