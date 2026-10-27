"""Paired unit tests for `app.core.database` (dev_rules Section 4.4 JIT sessions)."""

from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import Base, create_database_engine, get_db

EXPECTED_POOL_SIZE = 10
EXPECTED_MAX_OVERFLOW = 20
EXPECTED_POOL_RECYCLE_SECONDS = 1800


# ---------------------------------------------------------------------------
# HAPPY PATH
# ---------------------------------------------------------------------------
def test_should_build_engine_with_mandated_pool_settings():
    settings = Settings()

    engine = create_database_engine(settings)

    assert isinstance(engine, Engine)
    # `QueuePool` keeps the configured pool size on its internal queue.
    assert engine.pool._pool.maxsize == EXPECTED_POOL_SIZE
    assert engine.pool._max_overflow == EXPECTED_MAX_OVERFLOW
    assert engine.pool._recycle == EXPECTED_POOL_RECYCLE_SECONDS
    # `pool_pre_ping=True` keeps sessions healthy across MySQL restarts.
    assert engine.pool._pre_ping is True
    engine.dispose()


def test_should_declare_declarative_base_metadata_for_orm_models():
    assert Base.metadata is not None


def test_should_yield_a_session_when_dependency_is_consumed(mocker):
    fake_session = mocker.MagicMock(spec=Session)
    mocker.patch("app.core.database.SessionLocal", return_value=fake_session)
    session_generator = get_db()

    yielded_session = next(session_generator)

    assert yielded_session is fake_session
    session_generator.close()
    # Sessions are always returned to the pool immediately after the request.
    fake_session.close.assert_called_once_with()


# ---------------------------------------------------------------------------
# BOUNDARY
# ---------------------------------------------------------------------------
def test_should_close_session_only_once_when_generator_is_exhausted(mocker):
    fake_session = mocker.MagicMock(spec=Session)
    mocker.patch("app.core.database.SessionLocal", return_value=fake_session)
    session_generator = get_db()
    next(session_generator)

    session_generator.close()
    session_generator.close()

    # The `finally` block runs exactly once per generator instance.
    assert fake_session.close.call_count == 1


# ---------------------------------------------------------------------------
# ERROR HANDLING
# ---------------------------------------------------------------------------
def test_should_still_close_session_when_endpoint_raises(mocker):
    fake_session = mocker.MagicMock(spec=Session)
    mocker.patch("app.core.database.SessionLocal", return_value=fake_session)
    session_generator = get_db()
    next(session_generator)

    try:
        session_generator.throw(RuntimeError("endpoint exploded"))
    except RuntimeError:
        pass

    fake_session.close.assert_called_once_with()
