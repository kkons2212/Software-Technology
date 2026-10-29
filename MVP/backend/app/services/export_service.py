"""ExportService: Business logic layer for streaming telemetry reports (US 05.4)."""

import csv
import io
import json
from collections.abc import Generator
from datetime import date, datetime, time, timedelta, timezone

from app.repositories.telemetry_repository import TelemetryRepository

ANALYTICS_RANGE_TODAY = "TODAY"
ANALYTICS_RANGE_LAST_7_DAYS = "LAST_7_DAYS"
ANALYTICS_RANGE_LAST_30_DAYS = "LAST_30_DAYS"
SUPPORTED_ANALYTICS_RANGES = {
    ANALYTICS_RANGE_TODAY,
    ANALYTICS_RANGE_LAST_7_DAYS,
    ANALYTICS_RANGE_LAST_30_DAYS,
}

BUSINESS_TIMEZONE = timezone(timedelta(hours=7))


def _current_utc_time() -> datetime:
    """Indirection so unit tests can freeze clock deterministically."""
    return datetime.now(timezone.utc)


def _to_naive_utc(moment: datetime) -> datetime:
    """Normalise an aware instant to naive UTC for MySQL DATETIME columns."""
    return moment.astimezone(timezone.utc).replace(tzinfo=None)


class ExportService:
    def __init__(self, telemetry_repo: TelemetryRepository):
        self.repo = telemetry_repo

    def resolve_date_bounds(
        self,
        time_range: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[datetime, datetime | None]:
        """Resolve start and optional end datetime bounds from range preset or custom dates."""
        now_utc = _current_utc_time()

        if start_date is not None or end_date is not None:
            if start_date is None or end_date is None:
                raise ValueError(
                    "Both start_date and end_date are required for a custom date range"
                )
            if start_date > end_date:
                raise ValueError("start_date cannot be after end_date")

            start_dt = datetime.combine(start_date, time.min, tzinfo=BUSINESS_TIMEZONE)
            end_dt = datetime.combine(end_date, time.max, tzinfo=BUSINESS_TIMEZONE)
            return _to_naive_utc(start_dt), _to_naive_utc(end_dt)

        range_key = (time_range or ANALYTICS_RANGE_LAST_7_DAYS).upper()
        if range_key not in SUPPORTED_ANALYTICS_RANGES:
            raise ValueError(
                f"Unsupported analytics time range: '{time_range}'. "
                f"Expected one of: {sorted(SUPPORTED_ANALYTICS_RANGES)}."
            )

        if range_key == ANALYTICS_RANGE_TODAY:
            local_midnight = now_utc.astimezone(BUSINESS_TIMEZONE).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            return _to_naive_utc(local_midnight), None

        if range_key == ANALYTICS_RANGE_LAST_7_DAYS:
            return _to_naive_utc(now_utc - timedelta(days=7)), None

        # ANALYTICS_RANGE_LAST_30_DAYS
        return _to_naive_utc(now_utc - timedelta(days=30)), None

    def stream_csv(
        self, range_start: datetime, range_end: datetime | None = None
    ) -> Generator[str, None, None]:
        """Stream UTF-8 encoded CSV with BOM for seamless Excel compatibility (AC-05.4.1 & AC-05.4.2)."""
        # 1. Yield UTF-8 BOM so Microsoft Excel renders Vietnamese characters correctly
        yield "\ufeff"

        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Date",
            "Exhibit Name",
            "Trigger Count",
            "Language",
            "Average Dwell Duration (seconds)",
        ]
        writer.writerow(headers)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        records = self.repo.query_export_telemetry(range_start, range_end)
        for row in records:
            writer.writerow(row)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    def stream_json(
        self, range_start: datetime, range_end: datetime | None = None
    ) -> Generator[str, None, None]:
        """Stream structured JSON array of telemetry records (AC-05.4.1 & AC-05.4.2)."""
        records = self.repo.query_export_telemetry(range_start, range_end)
        yield "[\n"
        first = True
        for row in records:
            record_dict = {
                "date": row[0],
                "exhibit_name": row[1],
                "trigger_count": row[2],
                "language": row[3],
                "average_dwell_duration": row[4],
            }
            prefix = "  " if first else ",\n  "
            first = False
            yield prefix + json.dumps(record_dict, ensure_ascii=False)
        yield "\n]"
