"""Pytest root configuration and shared fixtures.

dev_rules Section 7.1: unit tests run against an isolated database with
automatic rollback. The suite therefore targets the project MySQL instance
documented in `documents/DatabaseSetup.md` (Docker container
`smart_museum_db`) instead of an in-memory engine.
"""

import os
import sys

import pytest
from sqlalchemy import Engine
from sqlalchemy.orm import Session

# Ensure backend root (MVP/backend) is always first in sys.path
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.config import Settings  # noqa: E402
from app.core.database import Base, create_database_engine  # noqa: E402
from app.models.audit import Audit  # noqa: E402,F401  (registers the `Audit` table)
from app.models.audio import POIAudio  # noqa: E402,F401  (registers `POIAudio`)
from app.models.language import LanguageCode  # noqa: E402,F401  (registers it)
from app.models.poi import POI  # noqa: E402,F401  (registers the `POI` table)
from app.models.translation import POITranslation  # noqa: E402,F401  (registers it)
from app.models.user import User  # noqa: E402,F401  (registers the `User` table)

LOW_COST_BCRYPT_ROUNDS = 4


@pytest.fixture(scope="session")
def test_engine() -> Engine:
    """Build one MySQL engine per session and guarantee the tables exist.

    `checkfirst=True` keeps the fixture idempotent: the Docker image already
    provisions the schema, so normal runs perform zero DDL.
    """
    engine = create_database_engine(Settings())
    Base.metadata.create_all(bind=engine, checkfirst=True)
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def use_low_cost_bcrypt(mocker):
    """Hash with a cheap Bcrypt cost so the unit suite stays far below 5s.

    Production keeps the mandated cost factor of 12 (AC-02.1.2); only the
    in-test settings singleton is overridden.
    """
    mocker.patch(
        "app.core.security.get_settings",
        return_value=Settings(BCRYPT_ROUNDS=LOW_COST_BCRYPT_ROUNDS),
    )


@pytest.fixture()
def db_session(test_engine: Engine) -> Session:
    """Yield a MySQL session whose writes are always rolled back.

    The session joins an outer transaction through a SAVEPOINT
    (`join_transaction_mode="create_savepoint"`), so a `commit()` inside a test
    only releases that savepoint while the enclosing transaction still discards
    every row at teardown. InnoDB natively supports SAVEPOINT, so the schema in
    the `smart_museum` database is never mutated by the test suite.
    """
    connection = test_engine.connect()
    outer_transaction = connection.begin()
    session = Session(
        bind=connection,
        autoflush=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()
