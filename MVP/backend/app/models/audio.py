"""Audio model compatibility definitions."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import ClassVar

AUDIO_STATUS_PENDING = "PENDING"
AUDIO_STATUS_READY = "READY"
AUDIO_STATUS_FAILED = "FAILED"


@dataclass
class POIAudio:
    """Compatibility dataclass representing audio narration metadata."""

    stran_id: str = ""
    audio_url: str = ""
    audio_id: str = ""
    duration: Decimal | float | None = None
    file_size: int | None = None
    status: str = AUDIO_STATUS_READY
    create_at: datetime | None = None
    update_at: datetime | None = None

    def __post_init__(self):
        if not self.audio_id and self.stran_id:
            self.audio_id = f"AUD_{self.stran_id}"
