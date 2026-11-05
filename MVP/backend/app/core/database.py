"""SQLAlchemy engine, session factory and the Just-In-Time `get_db` dependency.

US 02.1 / dev_rules Section 4.4: a session is opened only to run a query and is
closed immediately afterwards - it is never held open across external I/O.
"""

import re
import ssl
from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import Settings, get_settings


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model under `app/models`."""


def create_database_engine(settings: Settings | None = None) -> Engine:
    """Build the database engine with connection-pool settings or SQLite for tests."""
    cfg = settings or get_settings()
    db_url = cfg.DATABASE_URL
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})

    connect_args: dict[str, object] = {}

    if db_url.startswith("mysql://"):
        db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

    if "ssl-mode=" in db_url or "ssl_mode=" in db_url or "aivencloud" in db_url:
        db_url = re.sub(r"[?&]ssl[-_]mode=[^&]*", "", db_url)
        db_url = re.sub(r"\?&", "?", db_url).rstrip("?").rstrip("&")
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx

    if "charset=" not in db_url:
        delimiter = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{delimiter}charset=utf8mb4"

    return create_engine(
        db_url,
        connect_args=connect_args,
        pool_size=cfg.DB_POOL_SIZE,
        max_overflow=cfg.DB_MAX_OVERFLOW,
        pool_recycle=cfg.DB_POOL_RECYCLE_SECONDS,
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
