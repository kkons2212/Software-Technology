"""Database engine and session management following JIT lifecycle."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

# Engine configuration with connection pooling for MySQL 8.0+
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency provider ensuring session is opened for query and closed immediately."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
