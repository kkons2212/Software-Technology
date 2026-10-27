"""Paired unit tests for `app.models.user` (US 02.1 - AC-02.1.1)."""

from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import (
    EMAIL_MAX_LENGTH,
    FULL_NAME_MAX_LENGTH,
    PASSWORD_HASH_MAX_LENGTH,
    USER_NAME_MAX_LENGTH,
    User,
)

EXPECTED_TABLE_NAME = "User"
EXPECTED_DATABASE_COLUMNS = {
    "UserName",
    "Email",
    "Password_hash",
    "FullName",
    "Is_Active",
    "FalsedAttempts",
    "Lockeduntil",
    "Create_at",
    "Update_at",
}


def _build_admin() -> User:
    return User(
        user_name="admin",
        email="admin@cuchi.vn",
        password_hash="$2b$12$hash",
        full_name="System Administrator",
        is_active=True,
        falsed_attempts=0,
    )


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_map_user_model_to_expected_table_name():
    assert User.__tablename__ == EXPECTED_TABLE_NAME


def test_should_map_pascalcase_database_columns_matching_erd_ddl():
    database_column_names = {column.name for column in User.__table__.columns}

    assert database_column_names == EXPECTED_DATABASE_COLUMNS


def test_should_use_username_as_primary_key_and_email_as_unique():
    primary_key_columns = [column.name for column in User.__table__.primary_key.columns]

    assert primary_key_columns == ["UserName"]
    assert User.__table__.columns["Email"].unique is True


def test_should_declare_mandated_column_lengths():
    assert User.__table__.columns["UserName"].type.length == USER_NAME_MAX_LENGTH
    assert User.__table__.columns["Email"].type.length == EMAIL_MAX_LENGTH
    assert (
        User.__table__.columns["Password_hash"].type.length == PASSWORD_HASH_MAX_LENGTH
    )
    assert User.__table__.columns["FullName"].type.length == FULL_NAME_MAX_LENGTH


def test_should_never_declare_a_role_column():
    # dev_rules Section 4.1: strictly two actors, every `User` row is an Admin.
    assert "Role" not in {column.name for column in User.__table__.columns}


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_default_active_flag_and_failure_counter_on_insert(db_session: Session):
    admin = User(
        user_name="boundary-admin",
        email="boundary-admin@cuchi.vn",
        password_hash="$2b$12$hash",
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    assert admin.is_active is True
    assert admin.falsed_attempts == 0
    assert admin.locked_until is None
    assert admin.full_name is None


def test_should_allow_nullable_lockout_until_datetime(db_session: Session):
    admin = _build_admin()
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    assert isinstance(admin.create_at, datetime)
    assert isinstance(admin.update_at, datetime)


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_reject_user_without_password_hash(db_session: Session):
    # `Password_hash` is NOT NULL: plaintext-free storage is non-negotiable.
    db_session.add(User(user_name="no-hash-admin", email="no-hash-admin@cuchi.vn"))

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()
