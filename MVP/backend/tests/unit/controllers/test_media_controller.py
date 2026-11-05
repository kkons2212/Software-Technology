"""Tests for safe response headers on uploaded POI images."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.dependencies import get_storage_client
from app.main import create_app


class FakeStorageClient:
    async def download_file(self, relative_path: str) -> bytes:
        assert relative_path == "images/poi_0123456789abcdef.jpg"
        return b"verified-jpeg"


def test_poi_image_proxy_sets_safe_content_headers(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "STATIC_DIR", str(tmp_path))
    application = create_app()
    application.dependency_overrides[get_storage_client] = FakeStorageClient

    with TestClient(application) as client:
        response = client.get("/api/v1/media/poi-images/poi_0123456789abcdef.jpg")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["content-disposition"] == "inline"


def test_static_image_responses_set_defensive_headers(monkeypatch, tmp_path):
    image_dir = tmp_path / "images"
    image_dir.mkdir()
    (image_dir / "legacy.jpg").write_bytes(b"jpeg")
    (image_dir / "legacy.svg").write_text("<svg></svg>", encoding="utf-8")
    monkeypatch.setattr(settings, "STATIC_DIR", str(tmp_path))
    application = create_app()

    with TestClient(application) as client:
        image_response = client.get("/static/images/legacy.jpg")
        unsafe_response = client.get("/static/images/legacy.svg")

    assert image_response.headers["x-content-type-options"] == "nosniff"
    assert image_response.headers["content-disposition"] == "inline"
    assert unsafe_response.headers["x-content-type-options"] == "nosniff"
    assert unsafe_response.headers["content-disposition"] == "attachment"
