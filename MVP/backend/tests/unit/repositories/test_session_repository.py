"""Unit tests for SessionRepository (US 06.2)."""

from datetime import datetime, timedelta

from app.repositories.session_repository import SessionRepository


def test_create_session_defaults(db_session):
    repo = SessionRepository(db_session)
    session = repo.create_session(preferred_language="vi")

    assert session is not None
    assert session.SessionID.startswith("SES_")
    assert session.SessionCode.startswith("CCT-")
    assert len(session.SessionToken) == 32
    assert session.Status == "ACTIVE"
    assert session.PreferredLanguage == "vi"
    assert session.Expire_at is not None
    # Verify expiration is ~24 hours in the future
    diff = session.Expire_at - datetime.utcnow()
    assert 23.9 <= diff.total_seconds() / 3600 <= 24.1


def test_get_by_id_and_code_and_token(db_session):
    repo = SessionRepository(db_session)
    created = repo.create_session(
        session_code="CCT-TEST01",
        session_token="test_token_123456",
        preferred_language="en",
    )

    by_id = repo.get_by_id(created.SessionID)
    assert by_id is not None
    assert by_id.SessionCode == "CCT-TEST01"

    by_code = repo.get_by_code("CCT-TEST01")
    assert by_code is not None
    assert by_code.SessionID == created.SessionID

    by_token = repo.get_by_token("test_token_123456")
    assert by_token is not None
    assert by_token.SessionID == created.SessionID


def test_is_session_active_lifecycle(db_session):
    repo = SessionRepository(db_session)

    # 1. Non-existent session
    assert repo.is_session_active("NON_EXISTENT") is False

    # 2. Active valid session
    session = repo.create_session(session_code="CCT-ACTIVE1")
    assert repo.is_session_active(session) is True
    assert repo.is_session_active("CCT-ACTIVE1") is True
    assert repo.is_session_active(session.SessionToken) is True

    # 3. Expired session by status
    repo.expire_session("CCT-ACTIVE1")
    assert repo.is_session_active("CCT-ACTIVE1") is False

    # 4. Session with past Expire_at
    past_expiry = datetime.utcnow() - timedelta(minutes=5)
    past_session = repo.create_session(
        session_code="CCT-PAST01",
        expire_at=past_expiry,
    )
    assert repo.is_session_active(past_session) is False
    assert repo.is_session_active("CCT-PAST01") is False


def test_extend_session(db_session):
    repo = SessionRepository(db_session)
    session = repo.create_session(session_code="CCT-EXTEND")
    original_expire = session.Expire_at

    extended = repo.extend_session("CCT-EXTEND", hours=12)
    assert extended is not None
    assert extended.Expire_at > original_expire
