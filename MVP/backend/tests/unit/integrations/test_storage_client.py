"""Unit tests for StorageClient (Supabase cloud upload with local fallback)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.integrations.storage_client import StorageClient


@pytest.mark.asyncio
async def test_storage_client_cloud_upload_success(tmp_path):
    mock_response = MagicMock()
    mock_response.status_code = 200

    client = StorageClient(
        supabase_url="https://testproject.supabase.co",
        supabase_key="test-key-123",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )
    assert client.is_cloud_enabled is True

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client):
        url = await client.upload_file(
            relative_path="images/sample.jpg",
            content=b"test-image-content",
            content_type="image/jpeg",
        )

    assert (
        url
        == "https://testproject.supabase.co/storage/v1/object/public/test-bucket/images/sample.jpg"
    )
    mock_client.post.assert_awaited_once()
    assert (
        mock_client.post.await_args.kwargs["headers"]["Content-Disposition"] == "inline"
    )


@pytest.mark.asyncio
async def test_storage_client_cloud_upload_failure_falls_back_to_local(tmp_path):
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    client = StorageClient(
        supabase_url="https://testproject.supabase.co",
        supabase_key="test-key-123",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client):
        url = await client.upload_file(
            relative_path="images/fallback.jpg",
            content=b"fallback-bytes",
            content_type="image/jpeg",
        )

    assert url == "/static/images/fallback.jpg"
    saved_file = tmp_path / "images" / "fallback.jpg"
    assert saved_file.exists()
    assert saved_file.read_bytes() == b"fallback-bytes"


@pytest.mark.asyncio
async def test_storage_client_offline_mode_direct_local_save(tmp_path):
    client = StorageClient(
        supabase_url="",
        supabase_key="",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )
    assert client.is_cloud_enabled is False

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        url = await client.upload_file(
            relative_path="audio/narration.mp3",
            content=b"audio-bytes",
            content_type="audio/mpeg",
        )
        mock_client.post.assert_not_called()

    assert url == "/static/audio/narration.mp3"
    saved_file = tmp_path / "audio" / "narration.mp3"
    assert saved_file.exists()
    assert saved_file.read_bytes() == b"audio-bytes"


@pytest.mark.asyncio
async def test_storage_client_downloads_local_image(tmp_path):
    image_path = tmp_path / "images" / "poi_0123456789abcdef.jpg"
    image_path.parent.mkdir(parents=True)
    image_path.write_bytes(b"image-bytes")
    client = StorageClient(static_dir=str(tmp_path))

    content = await client.download_file("images/poi_0123456789abcdef.jpg")

    assert content == b"image-bytes"


@pytest.mark.asyncio
async def test_storage_client_downloads_cloud_image_when_not_local(tmp_path):
    client = StorageClient(
        supabase_url="https://testproject.supabase.co",
        supabase_key="test-key-123",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"cloud-image"
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.get.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client):
        content = await client.download_file("images/poi_0123456789abcdef.jpg")

    assert content == b"cloud-image"
    mock_client.get.assert_awaited_once_with(
        "https://testproject.supabase.co/storage/v1/object/public/"
        "test-bucket/images/poi_0123456789abcdef.jpg"
    )


@pytest.mark.asyncio
async def test_storage_client_delete_file_local_and_cloud(tmp_path):
    local_file = tmp_path / "images" / "to_delete.jpg"
    local_file.parent.mkdir(parents=True, exist_ok=True)
    local_file.write_bytes(b"dummy")

    mock_response = MagicMock()
    mock_response.status_code = 200

    client = StorageClient(
        supabase_url="https://testproject.supabase.co",
        supabase_key="test-key-123",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.delete.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client):
        success = await client.delete_file("images/to_delete.jpg")

    assert success is True
    assert not local_file.exists()
    mock_client.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_storage_client_upload_audio_file_helper(tmp_path):
    client = StorageClient(
        supabase_url="",
        supabase_key="",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )
    url = await client.upload_audio_file(
        file_name="sample_audio.mp3",
        content=b"sample-audio-data",
    )
    assert url == "/static/audio/sample_audio.mp3"
    assert (tmp_path / "audio" / "sample_audio.mp3").exists()


@pytest.mark.asyncio
async def test_storage_client_upload_image_file_helper(tmp_path):
    client = StorageClient(
        supabase_url="",
        supabase_key="",
        bucket_name="test-bucket",
        static_dir=str(tmp_path),
    )
    url = await client.upload_image_file(
        file_name="sample_photo.jpg",
        content=b"sample-photo-data",
    )
    assert url == "/static/images/sample_photo.jpg"
    assert (tmp_path / "images" / "sample_photo.jpg").exists()
