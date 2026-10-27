"""Paired unit tests for `app.models.audit` (US 02.1 - TSK-02.1.3 audit trail)."""

from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.audit import (
    AUDIT_DETAILS_MAX_LENGTH,
    AUDIT_IP_ADDRESS_MAX_LENGTH,
    AUDIT_STATUS_FAILED,
    AUDIT_STATUS_LOCKED,
    AUDIT_STATUS_SUCCESS,
    Audit,
)
from app.models.user import User

EXPECTED_TABLE_NAME = "Audit"
EXPECTED_DATABASE_COLUMNS = {
    "AuditID",
    "Status",
    "Ip_address",
    "Details",
    "Create_at",
    "UserName",
}
CLIENT_IP = "203.0.113.7"
CLIENT_IPV6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"


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


def _build_audit(**overrides: object) -> Audit:
    default_values: dict[str, object] = {
        "audit_id": "AUD-0123456789abcdef",
        "status": AUDIT_STATUS_SUCCESS,
        "ip_address": CLIENT_IP,
        "details": "ADMIN_LOGIN_SUCCESS",
        "user_name": "admin",
    }
    default_values.update(overrides)
    return Audit(**default_values)


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_map_audit_model_to_expected_table_name():
    assert Audit.__tablename__ == EXPECTED_TABLE_NAME


def test_should_map_pascalcase_database_columns_matching_erd_ddl():
    database_column_names = {column.name for column in Audit.__table__.columns}

    assert database_column_names == EXPECTED_DATABASE_COLUMNS


def test_should_persist_authentication_audit_row_with_client_ip(
    db_session: Session, seeded_admin
):
    db_session.add(_build_audit())
    db_session.commit()

    stored_row = db_session.query(Audit).one()

    assert stored_row.status == AUDIT_STATUS_SUCCESS
    assert stored_row.ip_address == CLIENT_IP
    assert stored_row.details == "ADMIN_LOGIN_SUCCESS"
    assert stored_row.user_name == "admin"
    assert isinstance(stored_row.create_at, datetime)


def test_should_persist_audit_row_when_ip_is_ipv6(db_session: Session, seeded_admin):
    db_session.add(
        _build_audit(audit_id="AUD-ffffffffffffffff", ip_address=CLIENT_IPV6)
    )
    db_session.commit()

    stored_row = db_session.query(Audit).one()

    # IPv6 is why `Ip_address` is VARCHAR(45) rather than VARCHAR(15).
    assert stored_row.ip_address == CLIENT_IPV6
    assert AUDIT_IP_ADDRESS_MAX_LENGTH == 45


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_expose_uppercase_status_enum_values():
    assert AUDIT_STATUS_SUCCESS == "SUCCESS"
    assert AUDIT_STATUS_FAILED == "FAILED"
    assert AUDIT_STATUS_LOCKED == "LOCKED"


def test_should_declare_details_column_width():
    assert Audit.__table__.columns["Details"].type.length == AUDIT_DETAILS_MAX_LENGTH


def test_should_allow_nullable_ip_and_details_columns(
    db_session: Session, seeded_admin
):
    db_session.add(
        _build_audit(audit_id="AUD-00000000deadbeef", ip_address=None, details=None)
    )
    db_session.commit()

    stored_row = db_session.query(Audit).one()

    assert stored_row.ip_address is None
    assert stored_row.details is None


def test_should_require_status_column(db_session: Session, seeded_admin):
    db_session.add(_build_audit(audit_id="AUD-1111111111111111", status=None))

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_reject_audit_row_without_owning_user(db_session: Session):
    # `UserName` is a NOT NULL foreign key to `User`.
    db_session.add(_build_audit(audit_id="AUD-2222222222222222", user_name=None))

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()


def test_should_reject_duplicate_audit_identifier(db_session: Session, seeded_admin):
    db_session.add(_build_audit(audit_id="AUD-3333333333333333"))
    db_session.commit()

    db_session.add(_build_audit(audit_id="AUD-3333333333333333"))

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()
