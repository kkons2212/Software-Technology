"""Unit tests for export endpoint in analytics_controller (US 05.4 - TSK-05.4.1)."""

from fastapi.testclient import TestClient

from app.core.dependencies import get_current_admin_profile, get_export_service
from app.main import app
from app.schemas.auth_schema import AdminProfileResponse


def test_export_csv_endpoint():
    mock_admin = AdminProfileResponse(
        user_name="admin",
        email="admin@cuchi.vn",
        full_name="System Administrator",
    )

    def mock_csv_stream(*args, **kwargs):
        yield "\ufeff"
        yield "Date,Exhibit Name,Trigger Count,Language,Average Dwell Duration (seconds)\n"
        yield "2026-10-29,Bunker,5,vi,60.0\n"

    mock_service = type(
        "MockExportService",
        (object,),
        {
            "resolve_date_bounds": lambda *args, **kwargs: (None, None),
            "stream_csv": mock_csv_stream,
            "stream_json": lambda *args, **kwargs: iter(["[]"]),
        },
    )()

    app.dependency_overrides[get_current_admin_profile] = lambda: mock_admin
    app.dependency_overrides[get_export_service] = lambda: mock_service

    try:
        client = TestClient(app)
        response = client.get("/api/v1/admin/analytics/export?format=csv&range=TODAY")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment; filename=" in response.headers["content-disposition"]
        assert ".csv" in response.headers["content-disposition"]
        assert "\ufeff" in response.text
        assert "Date,Exhibit Name" in response.text
    finally:
        app.dependency_overrides.pop(get_current_admin_profile, None)
        app.dependency_overrides.pop(get_export_service, None)


def test_export_json_endpoint():
    mock_admin = AdminProfileResponse(
        user_name="admin",
        email="admin@cuchi.vn",
        full_name="System Administrator",
    )

    def mock_json_stream(*args, **kwargs):
        yield '[\n  {"date": "2026-10-29", "exhibit_name": "Bunker", "trigger_count": 5}\n]'

    mock_service = type(
        "MockExportService",
        (object,),
        {
            "resolve_date_bounds": lambda *args, **kwargs: (None, None),
            "stream_csv": lambda *args, **kwargs: iter([""]),
            "stream_json": mock_json_stream,
        },
    )()

    app.dependency_overrides[get_current_admin_profile] = lambda: mock_admin
    app.dependency_overrides[get_export_service] = lambda: mock_service

    try:
        client = TestClient(app)
        response = client.get(
            "/api/v1/admin/analytics/export?format=json&range=LAST_7_DAYS"
        )
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]
        assert "attachment; filename=" in response.headers["content-disposition"]
        assert ".json" in response.headers["content-disposition"]
        assert '"exhibit_name": "Bunker"' in response.text
    finally:
        app.dependency_overrides.pop(get_current_admin_profile, None)
        app.dependency_overrides.pop(get_export_service, None)


def test_export_invalid_format_returns_422():
    mock_admin = AdminProfileResponse(
        user_name="admin",
        email="admin@cuchi.vn",
        full_name="System Administrator",
    )

    app.dependency_overrides[get_current_admin_profile] = lambda: mock_admin

    try:
        client = TestClient(app)
        response = client.get("/api/v1/admin/analytics/export?format=xml")
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_admin_profile, None)
