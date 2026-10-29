"""Analytics schemas: administrator telemetry summary contract (US 05.2)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AnalyticsTimeRange(str, Enum):
    """Reporting window accepted by the admin analytics summary endpoint."""

    TODAY = "TODAY"
    LAST_7_DAYS = "LAST_7_DAYS"
    LAST_30_DAYS = "LAST_30_DAYS"


class KpiSummaryDTO(BaseModel):
    """The four headline figures rendered in the dashboard KPI card grid."""

    total_visitors: int = Field(..., ge=0)
    total_audio_plays: int = Field(..., ge=0)
    top_exhibit_title: str | None = None
    average_tour_duration_minutes: float = Field(..., ge=0)


class PoiRankingEntryDTO(BaseModel):
    """A single ranked exhibit row in the Top 10 POI bar chart."""

    poi_id: str
    poi_title: str
    trigger_count: int = Field(..., ge=0)


class LanguageDistributionEntryDTO(BaseModel):
    """A single ranked language entry in the demographics list."""

    language_id: str
    language_name: str
    visitor_count: int = Field(..., ge=0)
    percentage: float = Field(..., ge=0, le=100)


class AnalyticsSummaryDTO(BaseModel):
    """Aggregated analytics payload covering AC-05.2.1 and AC-05.2.2."""

    time_range: str
    generated_at: datetime
    kpis: KpiSummaryDTO
    top_pois: list[PoiRankingEntryDTO]
    language_distribution: list[LanguageDistributionEntryDTO]


class AnalyticsSummaryResponse(BaseModel):
    """`{data: ...}` envelope consumed by the frontend apiClient unwrapper."""

    data: AnalyticsSummaryDTO


class HeatmapPointDTO(BaseModel):
    """A single aggregated GPS heatmap coordinate with normalized intensity (US 05.1)."""

    poi_id: str
    poi_title: str
    lat: float
    lng: float
    trigger_count: int = Field(..., ge=0)
    intensity: float = Field(..., ge=0.0, le=1.0)


class HeatmapDataDTO(BaseModel):
    """Payload representing visitor density telemetry across relic grounds."""

    time_range: str
    generated_at: datetime
    points: list[HeatmapPointDTO]
    total_points: int = Field(..., ge=0)
    max_trigger_count: int = Field(..., ge=0)


class HeatmapResponse(BaseModel):
    """`{data: ...}` envelope for heatmap aggregation API."""

    data: HeatmapDataDTO
