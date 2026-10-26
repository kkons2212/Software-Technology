"""Pytest root configuration and shared fixtures."""

import os
import sys

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root (MVP/backend) is always first in sys.path
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.config import Settings  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.models.audit import Audit  # noqa: E402,F401  (registers the `Audit` table)
from app.models.user import User  # noqa: E402,F401  (registers the `User` table)

IN_MEMORY_DATABASE_URL = "sqlite+pysqlite:///:memory:"
LOW_COST_BCRYPT_ROUNDS = 4


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
def db_session():
    """Provide a throwaway in-memory SQLite session sharing a single connection."""
    test_engine = create_engine(
        IN_MEMORY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    testing_session_factory = sessionmaker(
        bind=test_engine, autoflush=False, autocommit=False
    )
    session = testing_session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()
