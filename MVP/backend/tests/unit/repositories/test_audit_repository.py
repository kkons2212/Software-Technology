"""Paired unit tests for `app.repositories.audit_repository` (US 02.1 - TSK-02.1.3)."""

import re

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.audit import AUDIT_STATUS_FAILED, AUDIT_STATUS_SUCCESS, Audit
from app.models.user import User
from app.repositories.audit_repository import (
    AUDIT_ID_PREFIX,
    AUDIT_ID_RANDOM_LENGTH,
    AuditRepository,
)

EXPECTED_AUDIT_ID_PATTERN = re.compile(r"^AUD-[0-9a-f]{16}$")
EXPECTED_AUDIT_ID_LENGTH = 20
CLIENT_IP = "203.0.113.7"


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
