"""SQLAlchemy 2.x + Psycopg 3 database engines, pooling, and session management."""

import logging
from collections.abc import Generator

from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.config import Settings, get_settings
from app.utils.db_url import build_ssl_connect_args, mask_database_url, normalize_psycopg_url

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base declarative class for ORM models."""


class DatabaseNotConfiguredError(RuntimeError):
    """Raised when a database session is requested without DATABASE_URL configured."""


def _create_pooled_engine(raw_url: str, settings: Settings, *, readonly: bool = False) -> Engine:
    normalized_url = normalize_psycopg_url(raw_url)
    connect_args = build_ssl_connect_args(normalized_url, settings.db_ssl_mode)

    engine = create_engine(
        normalized_url,
        poolclass=QueuePool,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
        connect_args=connect_args,
        future=True,
    )

    if readonly:
        @event.listens_for(engine, "begin")
        def _set_transaction_readonly(conn):
            conn.execute(text("SET TRANSACTION READ ONLY"))

    logger.info(
        "Initialized %s SQLAlchemy engine for %s",
        "read-only" if readonly else "primary",
        mask_database_url(raw_url),
    )
    return engine


class DatabaseManager:
    """Manages primary and separate read-only SQLAlchemy engines and session factories."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.engine: Engine | None = None
        self.readonly_engine: Engine | None = None
        self.session_local: sessionmaker[Session] | None = None
        self.readonly_session_local: sessionmaker[Session] | None = None
        self._initialize_engines()

    def _initialize_engines(self) -> None:
        if self.settings.has_database_config and self.settings.database_url:
            self.engine = _create_pooled_engine(
                self.settings.database_url,
                self.settings,
                readonly=False,
            )
            self.session_local = sessionmaker(
                bind=self.engine,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False,
                class_=Session,
            )

        readonly_url = (
            self.settings.readonly_database_url.strip()
            if self.settings.readonly_database_url
            and self.settings.readonly_database_url.strip()
            else self.settings.database_url
        )
        if readonly_url and readonly_url.strip():
            self.readonly_engine = _create_pooled_engine(
                readonly_url,
                self.settings,
                readonly=True,
            )
            self.readonly_session_local = sessionmaker(
                bind=self.readonly_engine,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False,
                class_=Session,
            )

    def dispose(self) -> None:
        if self.engine is not None:
            self.engine.dispose()
        if self.readonly_engine is not None:
            self.readonly_engine.dispose()


db_manager = DatabaseManager(get_settings())


def get_db() -> Generator[Session, None, None]:
    """Yield a primary SQLAlchemy database session."""
    if db_manager.session_local is None:
        raise DatabaseNotConfiguredError(
            "DATABASE_URL is not configured. Set it in backend/.env before accessing the database."
        )
    db = db_manager.session_local()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_readonly_db() -> Generator[Session, None, None]:
    """Yield a read-only SQLAlchemy database session (for read APIs and future AI agents)."""
    if db_manager.readonly_session_local is None:
        raise DatabaseNotConfiguredError(
            "DATABASE_URL or READONLY_DATABASE_URL is not configured."
        )
    db = db_manager.readonly_session_local()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.rollback()
        db.close()

