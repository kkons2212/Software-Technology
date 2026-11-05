"""Storage client adapter for persistent media storage (Supabase Storage with local fallback)."""

import logging
from pathlib import Path
from typing import ClassVar

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class StorageClient:
    """Client for uploading and managing media objects in Supabase Storage with local disk fallback."""

    DEFAULT_TIMEOUT_SECONDS: ClassVar[float] = 15.0

    def __init__(
        self,
        supabase_url: str | None = None,
        supabase_key: str | None = None,
        bucket_name: str | None = None,
        static_dir: str | None = None,
        settings: Settings | None = None,
    ):
        resolved_settings = settings or get_settings()
        self.supabase_url = (
            supabase_url if supabase_url is not None else resolved_settings.SUPABASE_URL
        ).rstrip("/")
        self.supabase_key = (
            supabase_key if supabase_key is not None else resolved_settings.SUPABASE_KEY
        ).strip()
        self.bucket_name = (
            bucket_name
            if bucket_name is not None
            else (resolved_settings.SUPABASE_BUCKET_NAME or "museum-media")
        ).strip()
        self.static_dir = (
            static_dir if static_dir is not None else resolved_settings.STATIC_DIR
        )

    @property
    def is_cloud_enabled(self) -> bool:
        """Return True if cloud credentials for Supabase storage are configured."""
        return bool(self.supabase_url and self.supabase_key and self.bucket_name)

    def _get_public_cdn_url(self, clean_path: str) -> str:
        """Construct standard public CDN URL for an object in the public bucket."""
        return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{clean_path}"

    def _save_local_file(self, clean_path: str, content: bytes) -> str:
        """Save file bytes locally under static directory as resilient fallback."""
        destination_path = Path(self.static_dir) / clean_path
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.write_bytes(content)
        normalized_rel = clean_path.replace("\\", "/")
        return f"/static/{normalized_rel}"

    async def upload_file(
        self,
        relative_path: str,
        content: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file to Supabase Storage, falling back to local static filesystem on failure (SISE)."""
        clean_path = relative_path.lstrip("/\\")

        # Phase 1: Try Supabase Cloud Storage if configured
        if self.is_cloud_enabled:
            upload_url = (
                f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{clean_path}"
            )
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            }
            if clean_path.startswith("images/") and content_type.startswith("image/"):
                headers["Content-Disposition"] = "inline"
            try:
                async with httpx.AsyncClient(
                    timeout=self.DEFAULT_TIMEOUT_SECONDS
                ) as client:
                    resp = await client.post(
                        upload_url, headers=headers, content=content
                    )
                    if resp.status_code in (200, 201):
                        public_url = self._get_public_cdn_url(clean_path)
                        logger.info(
                            "Successfully uploaded object to Supabase: %s",
                            public_url,
                        )
                        return public_url
                    logger.warning(
                        "Supabase storage upload returned HTTP %s: %s. Falling back to local disk.",
                        resp.status_code,
                        resp.text[:200],
                    )
            except Exception as exc:
                logger.warning(
                    "Supabase storage upload error (%s). Falling back to local disk.",
                    exc,
                )

        # Phase 2: Local disk fallback (always guaranteed)
        return self._save_local_file(clean_path, content)

    async def download_file(self, relative_path: str) -> bytes:
        """Read a stored object from local disk or the configured public bucket."""
        clean_path = relative_path.lstrip("/\\")
        local_path = Path(self.static_dir) / clean_path
        if local_path.is_file():
            return local_path.read_bytes()

        if not self.is_cloud_enabled:
            raise FileNotFoundError(clean_path)

        async with httpx.AsyncClient(timeout=self.DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.get(self._get_public_cdn_url(clean_path))
        if response.status_code == 404:
            raise FileNotFoundError(clean_path)
        response.raise_for_status()
        return response.content

    async def delete_file(self, relative_path: str) -> bool:
        """Delete file from cloud storage or local disk."""
        clean_path = relative_path.lstrip("/\\")
        deleted = False

        if self.is_cloud_enabled:
            delete_url = (
                f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{clean_path}"
            )
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
            }
            try:
                async with httpx.AsyncClient(
                    timeout=self.DEFAULT_TIMEOUT_SECONDS
                ) as client:
                    resp = await client.delete(delete_url, headers=headers)
                    if resp.status_code in (200, 204):
                        deleted = True
            except Exception as exc:
                logger.warning("Supabase storage delete error: %s", exc)

        local_path = Path(self.static_dir) / clean_path
        if local_path.is_file():
            try:
                local_path.unlink()
                deleted = True
            except OSError:
                pass

        return deleted
