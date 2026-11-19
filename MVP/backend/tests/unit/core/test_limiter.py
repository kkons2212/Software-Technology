"""Unit tests for slowapi rate limiter configuration, dynamic toggle, and IP extraction."""

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import (
    custom_rate_limit_exceeded_handler,
    get_real_client_ip,
    limiter,
    rate_limit,
)


def test_get_real_client_ip_extracts_first_ip_from_x_forwarded_for():
    request = Request(
        {
            "type": "http",
            "headers": [
                (b"x-forwarded-for", b"203.0.113.195, 70.41.3.18, 150.172.238.178")
            ],
        }
    )
    ip = get_real_client_ip(request)
    assert ip == "203.0.113.195"


def test_get_real_client_ip_fallback_to_client_host():
    request = Request(
        {
            "type": "http",
            "headers": [],
            "client": ("198.51.100.42", 54321),
        }
    )
    ip = get_real_client_ip(request)
    assert ip == "198.51.100.42"


def test_get_real_client_ip_fallback_to_localhost():
    request = Request({"type": "http", "headers": []})
    ip = get_real_client_ip(request)
    assert ip == "127.0.0.1"


def test_rate_limit_enforced_and_returns_standard_error_envelope(monkeypatch):
    test_app = FastAPI()
    test_app.state.limiter = limiter
    test_app.add_exception_handler(
        RateLimitExceeded, custom_rate_limit_exceeded_handler
    )

    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_LOGIN", "2/minute")

    @test_app.get("/test-login")
    @rate_limit("RATE_LIMIT_LOGIN")
    def login_endpoint(request: Request):
        return {"success": True}

    with TestClient(test_app) as client:
        r1 = client.get("/test-login")
        r2 = client.get("/test-login")
        r3 = client.get("/test-login")

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    assert "Retry-After" in r3.headers
    body = r3.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "rate_limit" in body["error"]["details"]


def test_rate_limit_can_be_disabled_globally(monkeypatch):
    test_app = FastAPI()
    test_app.state.limiter = limiter
    test_app.add_exception_handler(
        RateLimitExceeded, custom_rate_limit_exceeded_handler
    )

    # Disable all rate limiting
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    monkeypatch.setattr(settings, "RATE_LIMIT_CHECKOUT", "1/minute")

    @test_app.get("/test-checkout")
    @rate_limit("RATE_LIMIT_CHECKOUT")
    def checkout_endpoint(request: Request):
        return {"success": True}

    with TestClient(test_app) as client:
        responses = [client.get("/test-checkout") for _ in range(5)]

    assert all(r.status_code == 200 for r in responses)


def test_rate_limit_can_be_disabled_per_endpoint(monkeypatch):
    test_app = FastAPI()
    test_app.state.limiter = limiter
    test_app.add_exception_handler(
        RateLimitExceeded, custom_rate_limit_exceeded_handler
    )

    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    # Disable specifically for this endpoint
    monkeypatch.setattr(settings, "RATE_LIMIT_WALKING_ROUTE", "disabled")

    @test_app.get("/test-route")
    @rate_limit("RATE_LIMIT_WALKING_ROUTE")
    def walking_route_endpoint(request: Request):
        return {"success": True}

    with TestClient(test_app) as client:
        responses = [client.get("/test-route") for _ in range(5)]

    assert all(r.status_code == 200 for r in responses)
