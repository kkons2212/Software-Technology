"""Unit tests for SystemHealth and Storage Controller (US 05.3 - TSK-05.3.1, TSK-05.3.3).

Verifies GET /api/v1/admin/system/health and POST /api/v1/admin/storage/clean-orphans.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import User

ADMIN_USER_NAME = "admin"
ADMIN_EMAIL = "admin@cuchi.vn"
ADMIN_PASSWORD = "Admin@12345"
LOGIN_ROUTE = "/api/v1/auth/login"
HEALTH_ROUTE = "/api/v1/admin/system/health"
CLEAN_ORPHANS_ROUTE = "/api/v1/admin/storage/clean-orphans"
FORWARDED_CLIENT_IP = "198.51.100.23"
X_FORWARDED_FOR_HEADER = {"x-forwarded-for": FORWARDED_CLIENT_IP}


@pytest.fixture()
def seeded_admin(db_session: Session) -> User:
    administrator = User(
        user_name=ADMIN_USER_NAME,
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name="System Administrator",
        is_active=True,
        falsed_attempts=0,
    )
    db_session.add(administrator)
    db_session.commit()
    return administrator


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def authenticated_client(client: TestClient, seeded_admin) -> TestClient:
    login_response = client.post(
        LOGIN_ROUTE, json={"username": ADMIN_USER_NAME, "password": ADMIN_PASSWORD}
    )
    assert login_response.status_code == 200
    return client


def test_should_return_system_health_metrics_when_authenticated(
    authenticated_client: TestClient,
):
    response = authenticated_client.get(HEALTH_ROUTE)

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    data = payload["data"]
    assert "disk_used_percent" in data
    assert "threshold_status" in data
    assert data["threshold_status"] in {"NORMAL", "WARNING", "CRITICAL"}
    assert "db_status" in data
    assert data["db_status"] == "connected"
    assert "db_latency_ms" in data
    assert "external_services_ok" in data
    assert data["external_services_ok"] is True
    assert "storage" in data
    assert data["storage"]["threshold_status"] == data["threshold_status"]


def test_should_return_401_when_admin_cookie_absent_on_health_check(client: TestClient):
    response = client.get(HEALTH_ROUTE)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_should_prune_orphaned_audio_and_return_reclaimed_metrics(
    authenticated_client: TestClient,
):
    response = authenticated_client.post(
        CLEAN_ORPHANS_ROUTE, headers=X_FORWARDED_FOR_HEADER
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    data = payload["data"]
    assert "deleted_count" in data
    assert "reclaimed_bytes" in data
    assert "reclaimed_mb" in data
    assert "remaining_files" in data
    assert "message" in data


def test_should_return_401_when_admin_cookie_absent_on_clean_orphans(
    client: TestClient,
):
    response = client.post(CLEAN_ORPHANS_ROUTE)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
