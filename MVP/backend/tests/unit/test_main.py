"""Unit tests for backend main entry point and health probe."""

from fastapi.testclient import TestClient

import app.main


def test_main_module():
    """Verify app.main is importable and initialized."""
    assert app.main is not None
    assert app.main.app is not None


def test_health_check_endpoint():
    """Verify health check probe returns 200 OK."""
    client = TestClient(app.main.app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
