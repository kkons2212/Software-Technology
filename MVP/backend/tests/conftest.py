"""Pytest root configuration and fixtures for unit testing against MySQL."""

import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

# Ensure backend root (MVP/backend) is always first in sys.path
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

import app.models  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Base, create_database_engine, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def test_engine() -> Engine:
    """Build one MySQL engine per session and guarantee the tables exist."""
    engine = create_database_engine(settings)
    Base.metadata.create_all(bind=engine, checkfirst=True)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(test_engine: Engine) -> Session:
    """Yield a MySQL session whose writes are always rolled back.

    The session joins an outer transaction through a SAVEPOINT
    (`join_transaction_mode="create_savepoint"`), so a `commit()` inside a test
    only releases that savepoint while the enclosing transaction still discards
    every row at teardown.
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


@pytest.fixture()
def client(db_session: Session):
    """FastAPI TestClient with overridden get_db dependency yielding the isolated session."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
