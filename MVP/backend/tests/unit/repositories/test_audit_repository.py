"""Paired unit tests for `app.repositories.audit_repository` (US 02.1 & US 02.3)."""

import re
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.audit import (
    AUDIT_DETAILS_LOGOUT,
    AUDIT_STATUS_FAILED,
    AUDIT_STATUS_SUCCESS,
    Audit,
)
from app.models.user import User
from app.repositories.audit_repository import (
    AUDIT_ID_PREFIX,
    AUDIT_ID_RANDOM_LENGTH,
    AuditRepository,
)

EXPECTED_AUDIT_ID_PATTERN = re.compile(r"^AUD-[0-9a-f]{16}$")
EXPECTED_AUDIT_ID_LENGTH = 20
CLIENT_IP = "203.0.113.7"

WATERMARK_AUDIT_IDS = (
    "AUD-0000000000000001",
    "AUD-0000000000000002",
    "AUD-0000000000000003",
)


def _seed_audit_row(
    db_session: Session,
    audit_id: str,
    user_name: str,
    details: str | None,
    create_at: datetime,
) -> Audit:
    """Write one audit row with an exact timestamp.

    `create_log_entry` lets MySQL stamp `Create_at` with `NOW()`, which cannot
    express the ordering this suite needs, so the row is inserted directly.
    """
    audit_row = Audit(
        audit_id=audit_id,
        user_name=user_name,
        status=AUDIT_STATUS_SUCCESS,
        details=details,
        create_at=create_at,
    )
    db_session.add(audit_row)
    db_session.commit()
    return audit_row


@pytest.fixture()
def repository(db_session: Session) -> AuditRepository:
    return AuditRepository(db_session)


@pytest.fixture()
def seeded_admin(db_session: Session) -> User:
    admin = User(
        user_name="admin",
        email="admin@cuchi.vn",
        password_hash="$2b$12$hash",
        is_active=True,
        falsed_attempts=0,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_generate_audit_identifier_matching_schema_constraints(repository):
    audit_id = repository.generate_audit_id()

    assert audit_id.startswith(f"{AUDIT_ID_PREFIX}-")
    assert len(audit_id) == EXPECTED_AUDIT_ID_LENGTH
    assert EXPECTED_AUDIT_ID_PATTERN.match(audit_id) is not None


def test_should_persist_audit_entry_and_return_refreshed_row(repository, seeded_admin):
    log_entry = repository.create_log_entry(
        user_name="admin",
        status=AUDIT_STATUS_SUCCESS,
        ip_address=CLIENT_IP,
        details="ADMIN_LOGIN_SUCCESS",
    )

    assert isinstance(log_entry, Audit)
    assert log_entry.audit_id.startswith("AUD-")
    assert log_entry.create_at is not None
    assert repository.db.query(Audit).count() == 1


def test_should_persist_failed_authentication_entry(repository, seeded_admin):
    repository.create_log_entry(
        user_name="admin", status=AUDIT_STATUS_FAILED, ip_address=CLIENT_IP
    )

    stored_row = repository.db.query(Audit).one()

    assert stored_row.status == AUDIT_STATUS_FAILED
    assert stored_row.ip_address == CLIENT_IP


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_allow_omitting_optional_ip_and_details(repository, seeded_admin):
    log_entry = repository.create_log_entry(
        user_name="admin", status=AUDIT_STATUS_SUCCESS
    )

    assert log_entry.ip_address is None
    assert log_entry.details is None


def test_should_generate_unique_identifier_for_every_call(repository):
    generated_ids = {repository.generate_audit_id() for _ in range(25)}
    expected_length = AUDIT_ID_RANDOM_LENGTH + len(AUDIT_ID_PREFIX) + 1

    # uuid4-based: 25 consecutive draws must never collide.
    assert len(generated_ids) == 25
    assert all(len(audit_id) == expected_length for audit_id in generated_ids)


# ---------------------------------------------------------------------------
# US 02.3: REVOCATION WATERMARK READ (TSK-02.3.1)
# ---------------------------------------------------------------------------
def test_should_return_none_when_no_logout_was_ever_recorded(
    repository, seeded_admin, db_session
):
    _seed_audit_row(
        db_session,
        WATERMARK_AUDIT_IDS[0],
        "admin",
        "ADMIN_LOGIN_SUCCESS",
        datetime(2026, 1, 1, 9, 0, 0),
    )

    assert repository.find_last_logout_at("admin") is None


def test_should_return_the_most_recent_logout_timestamp(
    repository, seeded_admin, db_session
):
    _seed_audit_row(
        db_session,
        WATERMARK_AUDIT_IDS[0],
        "admin",
        AUDIT_DETAILS_LOGOUT,
        datetime(2026, 1, 1, 10, 0, 0),
    )
    _seed_audit_row(
        db_session,
        WATERMARK_AUDIT_IDS[1],
        "admin",
        "ADMIN_LOGIN_SUCCESS",
        datetime(2026, 1, 1, 11, 30, 0),
    )
    _seed_audit_row(
        db_session,
        WATERMARK_AUDIT_IDS[2],
        "admin",
        AUDIT_DETAILS_LOGOUT,
        datetime(2026, 1, 1, 11, 0, 0),
    )

    # The later login row must not be mistaken for the watermark.
    assert repository.find_last_logout_at("admin") == datetime(2026, 1, 1, 11, 0, 0)


def test_should_scope_the_watermark_to_the_requested_user(
    repository, seeded_admin, db_session
):
    other_admin = User(
        user_name="other-admin",
        email="other-admin@cuchi.vn",
        password_hash="$2b$12$hash",
        is_active=True,
        falsed_attempts=0,
    )
    db_session.add(other_admin)
    db_session.commit()
    _seed_audit_row(
        db_session,
        WATERMARK_AUDIT_IDS[0],
        "other-admin",
        AUDIT_DETAILS_LOGOUT,
        datetime(2026, 1, 1, 12, 0, 0),
    )

    assert repository.find_last_logout_at("admin") is None
    assert repository.find_last_logout_at("other-admin") == datetime(
        2026, 1, 1, 12, 0, 0
    )


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_never_raise_http_exception_when_repository_fails(
    repository, seeded_admin
):
    # A NULL status violates the `Status` NOT NULL constraint; the repository
    # must surface the raw SQLAlchemy error, never an `HTTPException`.
    with pytest.raises(IntegrityError):
        repository.create_log_entry(user_name="admin", status=None)

    repository.db.rollback()
