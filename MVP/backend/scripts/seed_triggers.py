"""Seed realistic POI triggers and visitor sessions for testing US 05.1 & US 05.2."""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.database import SessionLocal  # noqa: E402
from app.models.poi import POI  # noqa: E402
from app.models.session import VisitorSession  # noqa: E402
from app.models.trigger import POITrigger  # noqa: E402

# Current local time (UTC+7)
now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

poi_distribution = [
    ("DEMOPOI01", 18),  # Commanding Bunker -> Heavy Congestion Alert (Red)
    ("DEMOPOI02", 9),  # Bunker Section 2 -> Moderate (Yellow)
    ("DEMOPOI03", 4),  # Bomb Crater -> Low (Green)
    ("DEMOPOI04", 5),  # Bamboo Trap -> Low (Green)
    ("DEMOPOI05", 2),  # Exhibition Room -> Low (Green)
]


def seed_triggers() -> None:
    with SessionLocal() as db:
        # 1. Create a few guest visitor sessions for today
        sessions = []
        languages = ["vi", "en", "ja", "ko"]
        for i in range(12):
            s = VisitorSession(
                SessionID=f"ds_{uuid.uuid4().hex[:12]}",
                SessionCode=f"T{i:05d}",
                SessionToken=uuid.uuid4().hex[:20],
                Status="ACTIVE",
                PreferredLanguage=languages[i % len(languages)],
                Create_at=now_utc - timedelta(hours=i % 4, minutes=5 * i),
            )
            db.add(s)
            sessions.append(s)
        db.commit()

        # 2. Add triggers for today
        total_added = 0
        for poi_id, count in poi_distribution:
            poi = db.query(POI).filter(POI.PoiID == poi_id).first()
            if not poi:
                print(f"Skipping missing POI '{poi_id}'")
                continue

            for j in range(count):
                sess = sessions[j % len(sessions)]
                trg = POITrigger(
                    TriggerID=f"trg_{uuid.uuid4().hex[:14]}",
                    SessionID=sess.SessionID,
                    PoiID=poi.PoiID,
                    DwellTime=60 + (j * 15),
                    Trigger_at=now_utc - timedelta(hours=(j % 3), minutes=(j * 4)),
                )
                db.add(trg)
                total_added += 1

        db.commit()
        print(
            f"Successfully seeded {len(sessions)} visitor sessions and {total_added} POI triggers for TODAY!"
        )


if __name__ == "__main__":
    seed_triggers()
