"""TelemetryService: Business logic layer for POI proximity trigger telemetry."""

from datetime import datetime, timedelta, timezone

from app.repositories.telemetry_repository import TelemetryRepository
from app.schemas.analytics_schema import (
    AnalyticsSummaryDTO,
    HeatmapDataDTO,
    HeatmapPointDTO,
    KpiSummaryDTO,
    LanguageDistributionEntryDTO,
    PoiRankingEntryDTO,
)
from app.schemas.telemetry_schema import (
    TelemetryTriggerCreate,
    TelemetryTriggerResponse,
)

ANALYTICS_RANGE_TODAY = "TODAY"
ANALYTICS_RANGE_LAST_7_DAYS = "LAST_7_DAYS"
ANALYTICS_RANGE_LAST_30_DAYS = "LAST_30_DAYS"
DEFAULT_ANALYTICS_RANGE = ANALYTICS_RANGE_LAST_7_DAYS
TOP_POI_LIMIT = 10
SECONDS_PER_MINUTE = 60
PERCENTAGE_SCALE = 100
DEFAULT_PREFERRED_LANGUAGE = "vi"
# Cu Chi Tunnels operates on Indochina Time (UTC+7); the TODAY window must close
# on the on-site calendar day, not on UTC midnight.
BUSINESS_TIMEZONE = timezone(timedelta(hours=7))


def _current_utc_time() -> datetime:
    """Indirection so unit tests can freeze the analytics clock deterministically."""
    return datetime.now(timezone.utc)


def _to_naive_utc(moment: datetime) -> datetime:
    """Normalise an aware instant to the naive UTC domain used by the DDL columns.

    `POITrigger.Trigger_at` and `VisitorSession.Create_at` are naive DATETIME
    values written by MySQL CURRENT_TIMESTAMP; comparing them against tz-aware
    bounds would raise or silently skew the window.
    """
    return moment.astimezone(timezone.utc).replace(tzinfo=None)


def _resolve_range_start(time_range: str) -> datetime:
    """Translate the API reporting window into an inclusive naive-UTC lower bound."""
    now_utc = _current_utc_time()

    if time_range == ANALYTICS_RANGE_TODAY:
        local_midnight = now_utc.astimezone(BUSINESS_TIMEZONE).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return _to_naive_utc(local_midnight)

    if time_range == ANALYTICS_RANGE_LAST_7_DAYS:
        return _to_naive_utc(now_utc - timedelta(days=7))

    if time_range == ANALYTICS_RANGE_LAST_30_DAYS:
        return _to_naive_utc(now_utc - timedelta(days=30))

    raise ValueError(f"Unsupported analytics time range '{time_range}'.")


class TelemetryService:
    def __init__(self, telemetry_repo: TelemetryRepository):
        self.telemetry_repo = telemetry_repo

    def ingest_trigger(
        self, payload: TelemetryTriggerCreate
    ) -> TelemetryTriggerResponse:
        poi = self.telemetry_repo.get_poi(payload.poi_id)
        if not poi:
            raise ValueError(f"POI with ID '{payload.poi_id}' does not exist.")

        # The visitor's language is captured when the session is first minted; an
        # already-existing session keeps its original choice so analytics report the
        # first-selected demographic instead of the latest write.
        preferred_language = payload.preferred_language or DEFAULT_PREFERRED_LANGUAGE
        session_id = payload.session_id
        if session_id:
            session = self.telemetry_repo.get_session(session_id)
            if not session:
                session = self.telemetry_repo.create_guest_session(
                    session_id=session_id, preferred_language=preferred_language
                )
        else:
            session = self.telemetry_repo.create_guest_session(
                preferred_language=preferred_language
            )

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

    def get_analytics_summary(
        self, time_range: str = DEFAULT_ANALYTICS_RANGE
    ) -> AnalyticsSummaryDTO:
        """Aggregate trigger and session telemetry into the US 05.2 dashboard payload."""
        range_start = _resolve_range_start(time_range)

        total_visitors = self.telemetry_repo.count_visitor_sessions(range_start)
        # FALLBACK-LOGIC: no dedicated audio-play event is persisted yet, so completed
        # proximity triggers are the accepted stand-in for "total audio plays" until a
        # play-event source lands (US 04.x / US 05.4).
        total_audio_plays = self.telemetry_repo.count_triggers(range_start)
        average_tour_seconds = self.telemetry_repo.average_tour_duration_seconds(
            range_start
        )
        poi_rows = self.telemetry_repo.list_poi_trigger_counts(
            range_start, TOP_POI_LIMIT
        )
        language_rows = self.telemetry_repo.list_language_distribution(range_start)

        top_pois = [
            PoiRankingEntryDTO(
                poi_id=poi_id, poi_title=poi_title, trigger_count=trigger_count
            )
            for poi_id, poi_title, trigger_count in poi_rows
        ]

        language_distribution = [
            LanguageDistributionEntryDTO(
                language_id=language_id,
                language_name=language_name,
                visitor_count=visitor_count,
                # Guarded division: an empty window reports 0% rather than raising.
                percentage=(
                    round(visitor_count / total_visitors * PERCENTAGE_SCALE, 2)
                    if total_visitors
                    else 0.0
                ),
            )
            for language_id, language_name, visitor_count in language_rows
        ]

        kpis = KpiSummaryDTO(
            total_visitors=total_visitors,
            total_audio_plays=total_audio_plays,
            top_exhibit_title=top_pois[0].poi_title if top_pois else None,
            average_tour_duration_minutes=round(
                average_tour_seconds / SECONDS_PER_MINUTE, 2
            ),
        )

        return AnalyticsSummaryDTO(
            time_range=time_range,
            generated_at=_current_utc_time(),
            kpis=kpis,
            top_pois=top_pois,
            language_distribution=language_distribution,
        )

    def get_heatmap_data(
        self, time_range: str = DEFAULT_ANALYTICS_RANGE
    ) -> HeatmapDataDTO:
        """Aggregate POITrigger coordinates and normalize intensity for US 05.1 heatmap."""
        range_start = _resolve_range_start(time_range)
        rows = self.telemetry_repo.list_heatmap_poi_triggers(range_start)
        max_trigger_count = max((row[4] for row in rows), default=0)
        points_accumulator: list[HeatmapPointDTO] = []
        for poi_id, title, lat, lng, count in rows:
            intensity = (
                round(count / max_trigger_count, 3) if max_trigger_count > 0 else 0.0
            )
            points_accumulator.append(
                HeatmapPointDTO(
                    poi_id=poi_id,
                    poi_title=title,
                    lat=lat,
                    lng=lng,
                    trigger_count=count,
                    intensity=intensity,
                )
            )

        return HeatmapDataDTO(
            time_range=time_range,
            generated_at=_current_utc_time(),
            points=points_accumulator,
            total_points=len(points_accumulator),
            max_trigger_count=max_trigger_count,
        )
