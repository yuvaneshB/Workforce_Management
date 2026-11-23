"""Service layer for API and Neon PostgreSQL connectivity diagnostics."""

import logging

from sqlalchemy import Engine, inspect, text

from app.core.config import Settings
from app.core.database import DatabaseManager
from app.schemas.health import ConnectionStatus, DatabaseHealthResponse, HealthResponse
from app.utils.db_url import mask_database_url

logger = logging.getLogger(__name__)


def get_api_health(settings: Settings) -> HealthResponse:
    """Return basic application health status."""
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.app_env,
    )


def _check_engine(
    engine: Engine | None,
    masked_target: str | None,
    *,
    check_readonly: bool = False,
) -> ConnectionStatus:
    if engine is None:
        return ConnectionStatus(
            configured=False,
            connected=False,
            read_only_enforced=None,
            target=None,
            error="Database URL is not configured.",
        )

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            ro_enforced: bool | None = None
            if check_readonly:
                ro_value = conn.execute(text("SHOW transaction_read_only")).scalar()
                ro_enforced = str(ro_value).lower() == "on"
            conn.rollback()

        return ConnectionStatus(
            configured=True,
            connected=True,
            read_only_enforced=ro_enforced,
            target=masked_target,
        )
    except Exception as exc:
        logger.warning("Database connectivity check failed for %s: %s", masked_target, type(exc).__name__)
        return ConnectionStatus(
            configured=True,
            connected=False,
            read_only_enforced=None,
            target=masked_target,
            error=f"{type(exc).__name__}: {exc}",
        )


def check_database_health(db_manager: DatabaseManager, settings: Settings) -> DatabaseHealthResponse:
    """Verify primary and read-only Neon PostgreSQL connectivity and list existing tables."""
    primary_target = mask_database_url(settings.database_url)
    readonly_raw = settings.readonly_database_url or settings.database_url
    readonly_target = mask_database_url(readonly_raw)

    primary_status = _check_engine(db_manager.engine, primary_target, check_readonly=False)
    readonly_status = _check_engine(db_manager.readonly_engine, readonly_target, check_readonly=True)

    discovered_tables: list[str] = []
    if readonly_status.connected and db_manager.readonly_engine is not None:
        try:
            inspector = inspect(db_manager.readonly_engine)
            discovered_tables = sorted(inspector.get_table_names(schema="public"))
        except Exception as exc:
            logger.warning("Schema table listing failed: %s", type(exc).__name__)

    if not primary_status.configured and not readonly_status.configured:
        overall = "unconfigured"
    elif primary_status.connected and readonly_status.connected:
        overall = "ok"
    else:
        overall = "degraded"

    return DatabaseHealthResponse(
        status=overall,
        primary=primary_status,
        readonly=readonly_status,
        discovered_tables=discovered_tables,
    )

