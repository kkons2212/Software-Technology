"""Unit tests for TelemetryController (TSK-01.3.5 & TSK-01.3.6)."""

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.session import VisitorSession


def setup_test_poi_and_language(db_session) -> POI:
    """Helper to seed LanguageCode and test POI."""
    lang = db_session.query(LanguageCode).filter_by(LanguageID="vi").first()
    if not lang:
        lang = LanguageCode(LanguageID="vi", LanguageName="Tiếng Việt")
        db_session.add(lang)

    poi = POI(
        PoiID="poi_test_001",
        Title="Hầm giải phẫu quân y",
        Short_Description="Bệnh viện dã chiến ngầm dưới lòng đất",
        Latitude=11.1432,
        Longitude=106.4631,
        Radius=30,
        Is_Active=True,
    )
    db_session.add(poi)
    db_session.commit()
    return poi


def test_should_ingest_telemetry_trigger_with_existing_session(client, db_session):
    poi = setup_test_poi_and_language(db_session)

    session = VisitorSession(
        SessionID="sess_active_01",
        SessionCode="SESS0001",
        SessionToken="token_secret_123",
        Status="ACTIVE",
        PreferredLanguage="vi",
    )
    db_session.add(session)
    db_session.commit()

    payload = {
        "SessionID": "sess_active_01",
        "PoiID": poi.PoiID,
        "DwellTime": 45,
        "TriggerType": "AUTO_GEOFENCE",
    }
    response = client.post("/api/v1/telemetry/trigger", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["session_id"] == "sess_active_01"
    assert data["poi_id"] == poi.PoiID
    assert data["dwell_time"] == 45
    assert "trigger_id" in data
    assert "trigger_at" in data


def test_should_ingest_telemetry_and_auto_create_guest_session_when_omitted(
    client, db_session
):
    poi = setup_test_poi_and_language(db_session)

    payload = {
        "PoiID": poi.PoiID,
        "DwellTime": 15,
    }
    response = client.post("/api/v1/telemetry/trigger", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["poi_id"] == poi.PoiID
    assert data["dwell_time"] == 15
    assert data["session_id"].startswith("guest_")


def test_should_auto_provision_session_when_given_unrecognized_session_id(
    client, db_session
):
    poi = setup_test_poi_and_language(db_session)

    payload = {
        "SessionID": "sess_visitor_brand",
        "PoiID": poi.PoiID,
        "DwellTime": 60,
    }
    response = client.post("/api/v1/telemetry/trigger", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["session_id"] == "sess_visitor_brand"
    assert data["poi_id"] == poi.PoiID


def test_should_return_404_when_poi_does_not_exist(client, db_session):
    setup_test_poi_and_language(db_session)

    payload = {
        "PoiID": "non_existent_poi_999",
        "DwellTime": 20,
    }
    response = client.post("/api/v1/telemetry/trigger", json=payload)
    assert response.status_code == 404
    assert "does not exist" in str(response.json())


def test_should_return_422_when_poi_id_is_missing(client, db_session):
    payload = {
        "DwellTime": 20,
    }
    response = client.post("/api/v1/telemetry/trigger", json=payload)
    assert response.status_code == 422


def test_should_return_422_when_dwell_time_is_negative(client, db_session):
    poi = setup_test_poi_and_language(db_session)
    payload = {
        "PoiID": poi.PoiID,
        "DwellTime": -10,
    }
    response = client.post("/api/v1/telemetry/trigger", json=payload)
    assert response.status_code == 422
