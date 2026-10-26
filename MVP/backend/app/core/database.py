"""SQLAlchemy engine, session factory and the Just-In-Time `get_db` dependency.

US 02.1 / dev_rules Section 4.4: a session is opened only to run a query and is
closed immediately afterwards - it is never held open across external I/O.
"""

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import Settings, get_settings


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model under `app/models`."""


def create_database_engine(settings: Settings) -> Engine:
    """Build the MySQL engine with the mandated connection-pool settings."""
    return create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_recycle=settings.DB_POOL_RECYCLE_SECONDS,
        pool_pre_ping=True,
    )


engine = create_database_engine(get_settings())

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a short-lived session and always close it, returning it to the pool."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
