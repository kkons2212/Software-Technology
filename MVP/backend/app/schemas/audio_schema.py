"""Response schemas for audio generation operations."""

from pydantic import BaseModel


class AudioRegenerationResponse(BaseModel):
    """New audio reference and review state after successful regeneration."""

    stran_id: str
    status: str
    audio_url: str
    audio_status: str
