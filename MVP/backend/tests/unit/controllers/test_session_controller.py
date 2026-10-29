"""Unit tests for Visitor Session Controller (US 06.3 - TSK-06.3.1 & TSK-06.3.3)."""

from datetime import datetime, timedelta

from app.models.session import VisitorSession


def test_restore_session_success(client, db_session):
    # Setup active session in database
    session_code = "CCT-TEST01"
    session = VisitorSession(
        SessionID="SES_TEST01",
        SessionCode=session_code,
        SessionToken="mock_session_token_123",
        Status="ACTIVE",
        Activate_at=datetime.utcnow(),
        Expire_at=datetime.utcnow() + timedelta(hours=20),
        PreferredLanguage="vi",
    )
    db_session.add(session)
    db_session.commit()

    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": session_code},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "SES_TEST01"
    assert data["session_code"] == session_code
    assert data["session_token"] == "mock_session_token_123"
    assert data["status"] == "ACTIVE"
    assert data["preferred_language"] == "vi"
    assert data["remaining_seconds"] > 0
    assert data["success"] is True


def test_restore_session_case_insensitive_and_whitespace(client, db_session):
    session_code = "CCT-CASE01"
    session = VisitorSession(
        SessionID="SES_CASE01",
        SessionCode=session_code,
        SessionToken="test_token_case01",
        Status="ACTIVE",
        Activate_at=datetime.utcnow(),
        Expire_at=datetime.utcnow() + timedelta(hours=10),
        PreferredLanguage="en",
    )
    db_session.add(session)
    db_session.commit()

    # Pass lowercase with surrounding spaces
    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": "  cct-case01  "},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_code"] == session_code
    assert data["preferred_language"] == "en"


def test_restore_session_prefix_normalization(client, db_session):
    session_code = "CCT-HEX123"
    session = VisitorSession(
        SessionID="SES_HEX123",
        SessionCode=session_code,
        SessionToken="test_token_hex123",
        Status="ACTIVE",
        Activate_at=datetime.utcnow(),
        Expire_at=datetime.utcnow() + timedelta(hours=5),
        PreferredLanguage="ja",
    )
    db_session.add(session)
    db_session.commit()

    # Pass 6-character suffix only
    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": "hex123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_code"] == session_code


def test_restore_session_not_found(client, db_session):
    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": "CCT-NONEXIST"},
    )

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "SESSION_NOT_FOUND"
    assert "Session code is invalid or has expired." in data["error"]["message"]


def test_restore_session_expired_timestamp(client, db_session):
    session_code = "CCT-EXPIRE01"
    session = VisitorSession(
        SessionID="SES_EXPIRE01",
        SessionCode=session_code,
        SessionToken="test_token_expired",
        Status="ACTIVE",
        Activate_at=datetime.utcnow() - timedelta(hours=30),
        Expire_at=datetime.utcnow() - timedelta(hours=6),
        PreferredLanguage="vi",
    )
    db_session.add(session)
    db_session.commit()

    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": session_code},
    )

    assert response.status_code == 410
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "SESSION_EXPIRED"
    assert "Session code is invalid or has expired." in data["error"]["message"]


def test_restore_session_inactive_status(client, db_session):
    session_code = "CCT-INACTIVE"
    session = VisitorSession(
        SessionID="SES_INACTIVE",
        SessionCode=session_code,
        SessionToken="test_token_inactive",
        Status="EXPIRED",
        Activate_at=datetime.utcnow() - timedelta(hours=2),
        Expire_at=datetime.utcnow() + timedelta(hours=22),
        PreferredLanguage="vi",
    )
    db_session.add(session)
    db_session.commit()

    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": session_code},
    )

    assert response.status_code == 410
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "SESSION_EXPIRED"


def test_restore_session_invalid_payload(client):
    response = client.post(
        "/api/v1/sessions/restore",
        json={"session_code": ""},
    )
    assert response.status_code == 422
