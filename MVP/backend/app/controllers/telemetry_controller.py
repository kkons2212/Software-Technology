"""TelemetryController: Ingestion endpoint for visitor POI proximity triggers (TSK-01.3.5)."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_telemetry_service
from app.schemas.telemetry_schema import TelemetryTriggerCreate, TelemetryTriggerResponse
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry"])


@router.post(
    "/trigger",
    response_model=TelemetryTriggerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record POI proximity trigger telemetry event",
    description="Logs visitor geofence proximity trigger with dwell time into POITrigger for heatmap analytics.",
)
def record_telemetry_trigger(
    payload: TelemetryTriggerCreate,
    telemetry_service: TelemetryService = Depends(get_telemetry_service),
) -> TelemetryTriggerResponse:
    try:
        return telemetry_service.ingest_trigger(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
