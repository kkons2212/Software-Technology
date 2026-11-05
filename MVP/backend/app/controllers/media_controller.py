"""Safe delivery routes for uploaded POI images."""

import logging
import re
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Response

from app.core.dependencies import get_storage_client
from app.integrations.storage_client import StorageClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/media", tags=["Media"])

IMAGE_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
POI_IMAGE_FILENAME = re.compile(r"poi_[a-f0-9]{16}\.(?:jpg|png|webp)\Z")


@router.get("/poi-images/{filename}")
async def get_poi_image(
    filename: Annotated[str, Path()],
    storage_client: StorageClient = Depends(get_storage_client),
) -> Response:
    """Return a previously uploaded raster POI image with defensive headers."""
    if not POI_IMAGE_FILENAME.fullmatch(filename):
        raise HTTPException(status_code=404, detail="Image not found.")

    extension = filename[filename.rfind(".") :]
    try:
        content = await storage_client.download_file(f"images/{filename}")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Image not found.") from exc
    except httpx.HTTPError as exc:
        logger.warning("Unable to retrieve uploaded POI image: %s", exc)
        raise HTTPException(
            status_code=502, detail="Unable to retrieve the image."
        ) from exc

    return Response(
        content=content,
        media_type=IMAGE_CONTENT_TYPES[extension],
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    )
