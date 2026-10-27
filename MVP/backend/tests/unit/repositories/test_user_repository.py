"""Paired unit tests for `app.repositories.user_repository`.

US 02.1 - TSK-02.1.1 / TSK-02.1.2: `find_by_username()`, `find_by_email()` and
the JIT session lifecycle. Every test runs against the rollback-isolated MySQL
session (`db_session` fixture), so no row ever reaches the shared schema.
"""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository

ACTIVE_ADMIN_USER_NAME = "admin"
ACTIVE_ADMIN_EMAIL = "admin@cuchi.vn"
ACTIVE_ADMIN_PASSWORD_HASH = (
    "$2b$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123"
)
ACTIVE_ADMIN_FULL_NAME = "System Administrator"
UNKNOWN_IDENTIFIER = "ghost-admin"


@pytest.fixture()
def repository(db_session: Session) -> UserRepository:
    """Repository bound to the rollback-isolated MySQL session."""
    return UserRepository(db_session)


def _build_admin(**overrides: object) -> User:
    """Build a `User` row with sensible defaults, overridable per test."""
    default_values: dict[str, object] = {
        "user_name": ACTIVE_ADMIN_USER_NAME,
        "email": ACTIVE_ADMIN_EMAIL,
        "password_hash": ACTIVE_ADMIN_PASSWORD_HASH,
        "full_name": ACTIVE_ADMIN_FULL_NAME,
        "is_active": True,
        "falsed_attempts": 0,
    }
    default_values.update(overrides)
    return User(**default_values)


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_return_admin_entity_when_username_exists(repository, db_session):
    persisted_admin = repository.create_admin(_build_admin())

    found_admin = repository.find_by_username(ACTIVE_ADMIN_USER_NAME)

    assert found_admin is not None
    assert found_admin.user_name == ACTIVE_ADMIN_USER_NAME
    assert found_admin.email == ACTIVE_ADMIN_EMAIL
    assert found_admin.password_hash == persisted_admin.password_hash
    assert found_admin.is_active is True


def test_should_return_admin_entity_when_email_exists(repository):
    repository.create_admin(_build_admin())

    found_admin = repository.find_by_email(ACTIVE_ADMIN_EMAIL)

    assert found_admin is not None
    assert found_admin.user_name == ACTIVE_ADMIN_USER_NAME


def test_should_apply_database_defaults_when_admin_created(repository):
    created_admin = repository.create_admin(_build_admin())

    # `create_admin` refreshes the instance so server-side defaults are visible.
    assert created_admin.falsed_attempts == 0
    assert created_admin.create_at is not None
    assert created_admin.update_at is not None
    # The session must not need a second flush: the row is already committed.
    assert created_admin in repository.db


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_return_none_when_username_not_found(repository):
    repository.create_admin(_build_admin())

    assert repository.find_by_username(UNKNOWN_IDENTIFIER) is None


def test_should_return_none_when_email_not_found(repository):
    repository.create_admin(_build_admin())

    assert repository.find_by_email(UNKNOWN_IDENTIFIER) is None


def test_should_not_match_email_when_looking_up_username(repository):
    repository.create_admin(_build_admin())

    # The two lookups are intentionally disjoint: an email is never a username.
    assert repository.find_by_username(ACTIVE_ADMIN_EMAIL) is None


def test_should_return_none_when_table_is_empty(repository):
    assert repository.find_by_username(ACTIVE_ADMIN_USER_NAME) is None
    assert repository.find_by_email(ACTIVE_ADMIN_EMAIL) is None


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_raise_integrity_error_when_username_already_exists(
    repository, db_session
):
    repository.create_admin(_build_admin())

    with pytest.raises(IntegrityError):
        repository.create_admin(_build_admin(email="second-admin@cuchi.vn"))

    # Roll back so the shared MySQL session stays usable for later tests.
    db_session.rollback()
    assert repository.find_by_email("second-admin@cuchi.vn") is None


def test_should_raise_integrity_error_when_email_already_exists(repository, db_session):
    repository.create_admin(_build_admin())

    with pytest.raises(IntegrityError):
        repository.create_admin(_build_admin(user_name="second-admin"))

    db_session.rollback()
    assert repository.find_by_username("second-admin") is None


def test_should_return_none_instead_of_raising_when_malformed_username_lookup(
    repository,
):
    # A non-existent identifier never raises: it degrades to `None` so the
    # service can answer with a generic 401 instead of leaking a 500.
    assert repository.find_by_username("") is None
    assert repository.find_by_email("") is None
