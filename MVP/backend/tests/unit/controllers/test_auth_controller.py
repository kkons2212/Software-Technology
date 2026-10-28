"""Paired unit tests for `app.controllers.auth_controller` (US 02.1, US 02.2 & US 02.3).

The controller is exercised through a real `TestClient` with the JIT `get_db`
dependency overridden by the rollback-isolated MySQL `db_session` fixture, so
every assertion covers the HTTP contract (status codes, HttpOnly cookie flags,
error envelope, HTTP 423 Locked countdown response, logout cookie purging and
server-side token invalidation).
"""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.audit import AUDIT_DETAILS_LOGOUT, Audit
from app.models.user import User

LOGIN_ROUTE = "/api/v1/auth/login"
LOGOUT_ROUTE = "/api/v1/auth/logout"
CURRENT_ADMIN_ROUTE = "/api/v1/auth/me"
VALID_USER_NAME = "admin"
VALID_EMAIL = "admin@cuchi.vn"
VALID_PASSWORD = "Admin@12345"
INVALID_CREDENTIALS_MESSAGE = "Invalid username or password"
ACCOUNT_LOCKED_MESSAGE = "Account temporarily locked due to 5 failed attempts. Please retry after 15 minutes."
LOGOUT_MESSAGE = "Administrator session terminated"
FORWARDED_CLIENT_IP = "198.51.100.23"
COOKIE_MAX_AGE_SECONDS = 3600


@pytest.fixture()
def seeded_admin(db_session: Session) -> User:
    admin = User(
        user_name=VALID_USER_NAME,
        email=VALID_EMAIL,
        password_hash=hash_password(VALID_PASSWORD),
        full_name="System Administrator",
        is_active=True,
        falsed_attempts=0,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_return_admin_profile_and_plant_httponly_cookie_on_valid_login(
    client, seeded_admin
):
    response = client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": VALID_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {
            "admin": {
                "user_name": VALID_USER_NAME,
                "email": VALID_EMAIL,
                "full_name": "System Administrator",
            }
        },
    }
    session_cookie = response.cookies.get(get_settings().ADMIN_SESSION_COOKIE_NAME)
    assert session_cookie
    # The JWT must be unreachable from JavaScript and never sent cross-site.
    set_cookie_header = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie_header
    assert "SameSite=strict" in set_cookie_header
    assert f"Max-Age={COOKIE_MAX_AGE_SECONDS}" in set_cookie_header


def test_should_return_current_admin_profile_when_session_cookie_present(
    client, seeded_admin
):
    login_response = client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": VALID_PASSWORD}
    )
    assert login_response.status_code == 200

    response = client.get(CURRENT_ADMIN_ROUTE)

    assert response.status_code == 200
    assert response.json()["data"]["admin"]["user_name"] == VALID_USER_NAME


def test_should_accept_email_as_login_identifier(client, seeded_admin):
    response = client.post(
        LOGIN_ROUTE, json={"username": VALID_EMAIL, "password": VALID_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()["data"]["admin"]["email"] == VALID_EMAIL


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_ignore_forwarded_header_when_absent(client, seeded_admin):
    # `TestClient` reports `testclient` as the peer address.
    response = client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": VALID_PASSWORD}
    )

    assert response.status_code == 200


def test_should_resolve_single_hop_from_x_forwarded_for_header():
    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", f"{FORWARDED_CLIENT_IP}, 10.0.0.1".encode())],
        "client": ("127.0.0.1", 1234),
    }
    from app.controllers.auth_controller import resolve_client_ip

    assert resolve_client_ip(Request(scope)) == FORWARDED_CLIENT_IP


def test_should_fall_back_to_peer_address_when_header_missing():
    from app.controllers.auth_controller import resolve_client_ip

    scope = {"type": "http", "headers": [], "client": ("127.0.0.1", 1234)}

    assert resolve_client_ip(Request(scope)) == "127.0.0.1"


def test_should_return_none_when_client_address_unavailable():
    from app.controllers.auth_controller import resolve_client_ip

    scope = {"type": "http", "headers": [], "client": None}

    assert resolve_client_ip(Request(scope)) is None


def test_should_accept_padded_username_after_normalization(client, seeded_admin):
    response = client.post(
        LOGIN_ROUTE,
        json={"username": f"  {VALID_USER_NAME}  ", "password": VALID_PASSWORD},
    )

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_return_generic_401_envelope_when_password_is_wrong(
    client, seeded_admin
):
    response = client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": "Wrong@12345"}
    )

    assert response.status_code == 401
    assert response.json() == {
        "success": False,
        "error": {
            "code": "INVALID_CREDENTIALS",
            "message": INVALID_CREDENTIALS_MESSAGE,
            "details": None,
        },
    }
    assert get_settings().ADMIN_SESSION_COOKIE_NAME not in response.cookies


def test_should_return_generic_401_envelope_when_user_does_not_exist(
    client, seeded_admin
):
    response = client.post(
        LOGIN_ROUTE, json={"username": "ghost-admin", "password": VALID_PASSWORD}
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == INVALID_CREDENTIALS_MESSAGE


def test_should_return_422_envelope_when_login_payload_is_invalid(client):
    response = client.post(LOGIN_ROUTE, json={"username": "", "password": ""})

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "REQUEST_VALIDATION_ERROR"


def test_should_return_401_envelope_when_session_cookie_absent(client):
    response = client.get(CURRENT_ADMIN_ROUTE)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_should_return_401_envelope_when_session_cookie_is_tampered(
    client, seeded_admin
):
    client.cookies.set(get_settings().ADMIN_SESSION_COOKIE_NAME, "tampered.jwt.value")

    response = client.get(CURRENT_ADMIN_ROUTE)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


# ---------------------------------------------------------------------------
# US 02.2: HTTP 423 LOCKED RESPONSE (TSK-02.2.2 & TSK-02.2.4)
# ---------------------------------------------------------------------------
def test_should_return_423_locked_envelope_when_account_locked_after_5_failures(
    client, seeded_admin
):
    for i in range(4):
        res = client.post(
            LOGIN_ROUTE,
            json={"username": VALID_USER_NAME, "password": f"BadPassword{i}"},
        )
        assert res.status_code == 401

    # 5th attempt returns 423
    response = client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": "BadPassword5"}
    )

    assert response.status_code == 423
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "ACCOUNT_LOCKED"
    assert body["error"]["message"] == ACCOUNT_LOCKED_MESSAGE
    assert body["error"]["details"]["retry_after_seconds"] == 900
    assert body["retry_after_seconds"] == 900
    assert get_settings().ADMIN_SESSION_COOKIE_NAME not in response.cookies


def test_should_reject_subsequent_login_with_423_when_account_locked(
    client, seeded_admin, db_session
):
    seeded_admin.falsed_attempts = 5
    seeded_admin.locked_until = datetime.utcnow() + timedelta(minutes=15)
    db_session.commit()

    response = client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": VALID_PASSWORD}
    )

    assert response.status_code == 423
    body = response.json()
    assert body["error"]["code"] == "ACCOUNT_LOCKED"
    assert body["error"]["details"]["retry_after_seconds"] <= 900
    assert body["retry_after_seconds"] <= 900


# ---------------------------------------------------------------------------
# US 02.3: LOGOUT & TOKEN INVALIDATION (TSK-02.3.1 & TSK-02.3.3)
# ---------------------------------------------------------------------------
def _login(client: TestClient):
    return client.post(
        LOGIN_ROUTE, json={"username": VALID_USER_NAME, "password": VALID_PASSWORD}
    )


def test_should_terminate_session_and_purge_cookie_on_logout(
    client, seeded_admin, db_session
):
    _login(client)

    # The header makes the originating address deterministic, which the raw
    # TestClient peer address is not.
    response = client.post(
        LOGOUT_ROUTE, headers={"x-forwarded-for": FORWARDED_CLIENT_IP}
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"message": LOGOUT_MESSAGE},
    }
    # AC-02.3.1: the browser is told to drop the cookie immediately.
    assert "Max-Age=0" in response.headers["set-cookie"]

    logout_row = (
        db_session.query(Audit).filter(Audit.details == AUDIT_DETAILS_LOGOUT).one()
    )
    assert logout_row.user_name == VALID_USER_NAME
    assert logout_row.ip_address == FORWARDED_CLIENT_IP

    # The session is gone from the same cookie jar as well.
    assert client.get(CURRENT_ADMIN_ROUTE).status_code == 401


def test_should_reject_a_replayed_token_after_logout(client, seeded_admin):
    login_response = _login(client)
    session_cookie_name = get_settings().ADMIN_SESSION_COOKIE_NAME
    stolen_cookie_value = login_response.cookies.get(session_cookie_name)

    assert client.post(LOGOUT_ROUTE).status_code == 200

    # Replay the exact JWT that was still in the browser: deleting the cookie
    # alone would not stop a copy of the token from working until `exp`.
    client.cookies.set(session_cookie_name, stolen_cookie_value)
    replay_response = client.get(CURRENT_ADMIN_ROUTE)

    assert replay_response.status_code == 401
    assert replay_response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_should_return_401_and_write_no_audit_row_when_logout_has_no_session(
    client, seeded_admin, db_session
):
    response = client.post(LOGOUT_ROUTE)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
    assert db_session.query(Audit).count() == 0


def test_should_return_401_when_logout_is_called_twice(client, seeded_admin):
    _login(client)

    assert client.post(LOGOUT_ROUTE).status_code == 200
    second_response = client.post(LOGOUT_ROUTE)

    assert second_response.status_code == 401
    assert second_response.json()["error"]["code"] == "UNAUTHENTICATED"
