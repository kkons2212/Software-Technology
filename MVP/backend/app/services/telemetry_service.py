"""TelemetryService: Business logic layer for POI proximity trigger telemetry."""

from app.repositories.telemetry_repository import TelemetryRepository
from app.schemas.telemetry_schema import (
    TelemetryTriggerCreate,
    TelemetryTriggerResponse,
)


class TelemetryService:
    def __init__(self, telemetry_repo: TelemetryRepository):
        self.telemetry_repo = telemetry_repo

    def ingest_trigger(
        self, payload: TelemetryTriggerCreate
    ) -> TelemetryTriggerResponse:
        poi = self.telemetry_repo.get_poi(payload.poi_id)
        if not poi:
            raise ValueError(f"POI with ID '{payload.poi_id}' does not exist.")

        session_id = payload.session_id
        if session_id:
            session = self.telemetry_repo.get_session(session_id)
            if not session:
                session = self.telemetry_repo.create_guest_session(
                    session_id=session_id
                )
        else:
            session = self.telemetry_repo.create_guest_session()

        trigger = self.telemetry_repo.create_trigger(
            session_id=session.SessionID,
            poi_id=poi.PoiID,
            dwell_time=payload.dwell_time,
        )

        return TelemetryTriggerResponse(
            trigger_id=trigger.TriggerID,
            session_id=trigger.SessionID,
            poi_id=trigger.PoiID,
            dwell_time=trigger.DwellTime,
            trigger_at=trigger.Trigger_at,
        )
