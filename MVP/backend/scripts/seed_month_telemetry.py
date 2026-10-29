"""Seed 30 days of realistic visitor sessions and POI triggers (US 05.4 & US 05.2)."""

import os
import random
import sys
import uuid
from datetime import datetime, time, timedelta, timezone

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.database import SessionLocal  # noqa: E402
from app.models.poi import POI  # noqa: E402
from app.models.session import VisitorSession  # noqa: E402
from app.models.trigger import POITrigger  # noqa: E402

# Local time zone UTC+7
LOCAL_TZ = timezone(timedelta(hours=7))
LANGUAGES = ["vi", "vi", "vi", "en", "en", "ja", "ko", "zh"]


def seed_month_data(days_count: int = 30) -> None:
    now_local = datetime.now(LOCAL_TZ)
    today_date = now_local.date()

    with SessionLocal() as db:
        # Fetch active POIs
        pois = db.query(POI).filter(POI.is_active.is_(True)).all()
        if not pois:
            print("No active POIs found in database!")
            return

        poi_ids = [p.PoiID for p in pois]
        print(f"Found {len(poi_ids)} active POIs: {poi_ids}")

        total_sessions = 0
        total_triggers = 0

        # Seed from (days_count - 1) days ago up to today
        for day_offset in range(days_count - 1, -1, -1):
            target_date = today_date - timedelta(days=day_offset)

            # Generate 4 to 8 visitor sessions per day
            # Weekend days (Saturday, Sunday) get higher traffic
            is_weekend = target_date.weekday() in (5, 6)
            sessions_today_count = (
                random.randint(8, 14) if is_weekend else random.randint(4, 7)
            )

            for _ in range(sessions_today_count):
                lang = random.choice(LANGUAGES)
                # Operating hours: between 8:00 and 16:30
                hour = random.randint(8, 16)
                minute = random.randint(0, 59)
                session_time_local = datetime.combine(
                    target_date, time(hour, minute), tzinfo=LOCAL_TZ
                )
                session_time_utc = session_time_local.astimezone(timezone.utc).replace(
                    tzinfo=None
                )

                session_id = f"ds_{uuid.uuid4().hex[:12]}"
                session_code = f"CCT-{uuid.uuid4().hex[:6].upper()}"

                session = VisitorSession(
                    SessionID=session_id,
                    SessionCode=session_code,
                    SessionToken=uuid.uuid4().hex[:20],
                    Status="ACTIVE",
                    PreferredLanguage=lang,
                    Create_at=session_time_utc,
                    Expire_at=session_time_utc + timedelta(hours=24),
                )
                db.add(session)
                total_sessions += 1

                # Each visitor triggers 2 to 5 POIs during their visit
                triggered_pois = random.sample(
                    poi_ids, k=min(len(poi_ids), random.randint(2, 5))
                )
                for step_idx, poi_id in enumerate(triggered_pois):
                    trigger_time_utc = session_time_utc + timedelta(
                        minutes=step_idx * random.randint(10, 25)
                    )
                    dwell_seconds = random.randint(45, 360)

                    trigger = POITrigger(
                        TriggerID=f"trg_{uuid.uuid4().hex[:14]}",
                        SessionID=session.SessionID,
                        PoiID=poi_id,
                        DwellTime=dwell_seconds,
                        Trigger_at=trigger_time_utc,
                    )
                    db.add(trigger)
                    total_triggers += 1

        db.commit()
        print(
            f"Successfully seeded {total_sessions} visitor sessions and {total_triggers} POI triggers "
            f"spanning {days_count} days (from {today_date - timedelta(days=days_count - 1)} to {today_date})!"
        )


if __name__ == "__main__":
    seed_month_data(30)
