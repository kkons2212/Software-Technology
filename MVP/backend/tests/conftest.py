"""Pytest root configuration and shared fixtures for unit testing against MySQL."""

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

from app.core.config import Settings, settings  # noqa: E402
from app.core.database import Base, create_database_engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.audio import POIAudio  # noqa: E402,F401
from app.models.audit import Audit  # noqa: E402,F401
from app.models.language import LanguageCode  # noqa: E402
from app.models.poi import POI  # noqa: E402,F401
from app.models.translation import POITranslation  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401

LOW_COST_BCRYPT_ROUNDS = 4


@pytest.fixture(scope="session")
def test_engine() -> Engine:
    """Build one MySQL engine per session and guarantee the tables exist."""
    engine = create_database_engine(settings)
    Base.metadata.create_all(bind=engine, checkfirst=True)
    with Session(bind=engine) as session:
        existing = {lang.language_id for lang in session.query(LanguageCode).all()}
        for code, name in [
            ("vi", "Tiếng Việt"),
            ("en", "English"),
            ("ja", "Japanese"),
            ("ko", "Korean"),
            ("zh", "Chinese"),
        ]:
            if code not in existing:
                session.add(LanguageCode(language_id=code, language_name=name))
        session.commit()
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def use_low_cost_bcrypt(mocker):
    """Hash with a cheap Bcrypt cost so the unit suite stays fast."""
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
