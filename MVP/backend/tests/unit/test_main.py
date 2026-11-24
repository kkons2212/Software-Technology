"""Paired unit tests for `app.main` (US 02.1 application wiring)."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.main
from app.main import API_TITLE, API_VERSION, create_app

EXPECTED_ROUTE_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/me",
}


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_build_fastapi_application_when_create_app_called():
    application = create_app()

    assert isinstance(application, FastAPI)
    assert application.title == API_TITLE
    assert application.version == API_VERSION


def test_should_register_auth_routes_when_application_created():
    application = create_app()

    registered_paths = {route.path for route in application.routes}

    assert EXPECTED_ROUTE_PATHS.issubset(registered_paths)


def test_should_expose_module_level_application_instance():
    assert isinstance(app.main.app, FastAPI)
    assert app.main.app.title == API_TITLE


def test_should_serve_standardized_401_envelope_from_the_real_application():
    # The catch-all error envelope is installed by `register_error_handlers`
    # inside `create_app`, so an anonymous call must still be well-formed.
    with TestClient(app.main.app) as client:
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["success"] is False
    assert set(response.json()["error"]) == {"code", "message", "details"}


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_isolate_application_instances_between_create_app_calls():
    first_application = create_app()
    second_application = create_app()

    # Every call yields a fresh instance so route registration never leaks.
    assert first_application is not second_application
    assert first_application.title == second_application.title


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_return_404_envelope_for_unknown_route():
    with TestClient(app.main.app) as client:
        response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "error": {
            "code": "HTTP_ERROR",
            "message": "Not Found",
            "details": None,
        },
    }


@pytest.mark.asyncio
async def test_lifespan_respects_render_keep_alive_toggle(monkeypatch):
    """Verify lifespan starts keep-alive task only when RENDER_KEEP_ALIVE_ENABLED is True."""
    import asyncio
    from unittest.mock import AsyncMock, MagicMock

    monkeypatch.setenv("ENV", "production")
    monkeypatch.setattr(app.main.settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(app.main.settings, "PIPELINE_AUTO_RECOVERY", False)

    fake_queue = MagicMock()
    fake_queue.start_worker = AsyncMock()
    fake_queue.stop_worker = AsyncMock()
    monkeypatch.setattr(
        "app.services.pipeline_queue.get_pipeline_queue", lambda: fake_queue
    )

    started_calls = []

    async def fake_keep_alive(interval_seconds: int, wakeup_timeout: float):
        started_calls.append((interval_seconds, wakeup_timeout))
        await asyncio.sleep(3600)

    monkeypatch.setattr(app.main, "_render_keep_alive_loop", fake_keep_alive)

    # Case 1: Default False -> keep-alive does not start
    monkeypatch.setattr(app.main.settings, "RENDER_KEEP_ALIVE_ENABLED", False)
    async with app.main.lifespan(app.main.app):
        await asyncio.sleep(0)
    assert started_calls == []

    # Case 2: Enabled True -> keep-alive starts and cancels cleanly on exit
    monkeypatch.setattr(app.main.settings, "RENDER_KEEP_ALIVE_ENABLED", True)
    monkeypatch.setattr(app.main.settings, "RENDER_KEEP_ALIVE_INTERVAL_SECONDS", 600)
    monkeypatch.setattr(app.main.settings, "RENDER_TRANSLATION_TIMEOUT", 70.0)
    async with app.main.lifespan(app.main.app):
        await asyncio.sleep(0)
    assert started_calls == [(600, 70.0)]
