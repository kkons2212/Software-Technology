"""AnalyticsController: Administrator aggregated telemetry analytics (US 05.2 & US 05.1)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_admin_profile, get_telemetry_service
from app.core.exceptions import REQUEST_VALIDATION_ERROR_CODE, ApiError
from app.schemas.analytics_schema import (
    AnalyticsSummaryResponse,
    AnalyticsTimeRange,
    HeatmapResponse,
)
from app.schemas.auth_schema import AdminProfileResponse
from app.services.telemetry_service import TelemetryService

ANALYTICS_ROUTE_PREFIX = "/api/v1/admin/analytics"
DEFAULT_ANALYTICS_RANGE = AnalyticsTimeRange.LAST_7_DAYS

router = APIRouter(prefix=ANALYTICS_ROUTE_PREFIX, tags=["Administrator Analytics"])


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Aggregated visitor KPIs, Top 10 POI ranking and language demographics",
)
def get_analytics_summary(
    # `range` is aliased because the parameter name would shadow the Python builtin.
    time_range: Annotated[
        AnalyticsTimeRange, Query(alias="range")
    ] = DEFAULT_ANALYTICS_RANGE,
    telemetry_service: TelemetryService = Depends(get_telemetry_service),
    _current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> AnalyticsSummaryResponse:
    """Serve the admin analytics dashboard payload for the requested reporting window."""
    try:
        summary = telemetry_service.get_analytics_summary(time_range.value)
    except ValueError as exc:
        raise ApiError(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code=REQUEST_VALIDATION_ERROR_CODE,
            message=str(exc),
        ) from exc
    return AnalyticsSummaryResponse(data=summary)


@router.get(
    "/heatmap",
    response_model=HeatmapResponse,
    status_code=status.HTTP_200_OK,
    summary="Real-time visitor density heatmap telemetry aggregation (US 05.1)",
)
def get_heatmap_telemetry(
    time_range: Annotated[
        AnalyticsTimeRange, Query(alias="range")
    ] = DEFAULT_ANALYTICS_RANGE,
    telemetry_service: TelemetryService = Depends(get_telemetry_service),
    _current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> HeatmapResponse:
    """Serve aggregated POITrigger GPS coordinates with normalized intensities."""
    try:
        heatmap_data = telemetry_service.get_heatmap_data(time_range.value)
    except ValueError as exc:
        raise ApiError(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code=REQUEST_VALIDATION_ERROR_CODE,
            message=str(exc),
        ) from exc
    return HeatmapResponse(data=heatmap_data)
