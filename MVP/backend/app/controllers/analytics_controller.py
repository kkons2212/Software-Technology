"""AnalyticsController: Administrator aggregated telemetry analytics (US 05.2, US 05.1 & US 05.4)."""

from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import (
    get_current_admin_profile,
    get_export_service,
    get_telemetry_service,
)
from app.core.exceptions import REQUEST_VALIDATION_ERROR_CODE, ApiError
from app.schemas.analytics_schema import (
    AnalyticsSummaryResponse,
    AnalyticsTimeRange,
    HeatmapResponse,
)
from app.schemas.auth_schema import AdminProfileResponse
from app.services.export_service import ExportService
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


@router.get(
    "/export",
    status_code=status.HTTP_200_OK,
    summary="Stream structured CSV or JSON telemetry dataset for export (US 05.4)",
)
def export_telemetry_dataset(
    format: Annotated[
        str, Query(pattern="^(csv|json)$", description="File format ('csv' or 'json')")
    ] = "csv",
    time_range: Annotated[AnalyticsTimeRange | None, Query(alias="range")] = None,
    start_date: Annotated[
        date | None, Query(description="Start date (YYYY-MM-DD)")
    ] = None,
    end_date: Annotated[date | None, Query(description="End date (YYYY-MM-DD)")] = None,
    export_service: ExportService = Depends(get_export_service),
    _current_admin: AdminProfileResponse = Depends(get_current_admin_profile),
) -> StreamingResponse:
    """Stream aggregated telemetry records as CSV (with UTF-8 BOM) or JSON (AC-05.4.1 & AC-05.4.2)."""
    range_str = time_range.value if time_range else None
    try:
        range_start, range_end = export_service.resolve_date_bounds(
            time_range=range_str,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise ApiError(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code=REQUEST_VALIDATION_ERROR_CODE,
            message=str(exc),
        ) from exc

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    if format == "json":
        media_type = "application/json"
        filename = f"telemetry_report_{timestamp_str}.json"
        stream_generator = export_service.stream_json(range_start, range_end)
    else:
        media_type = "text/csv; charset=utf-8"
        filename = f"telemetry_report_{timestamp_str}.csv"
        stream_generator = export_service.stream_csv(range_start, range_end)

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(
        stream_generator,
        media_type=media_type,
        headers=headers,
    )
