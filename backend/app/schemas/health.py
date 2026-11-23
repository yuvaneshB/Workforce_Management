"""Pydantic schemas for health and database connectivity endpoints."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Basic API health check payload."""

    status: str
    app_name: str
    environment: str


class ConnectionStatus(BaseModel):
    """Status of a single database connection pool."""

    configured: bool
    connected: bool
    read_only_enforced: bool | None = None
    target: str | None = None
    error: str | None = None


class DatabaseHealthResponse(BaseModel):
    """Database connectivity check payload for primary and read-only connections."""

    status: str
    primary: ConnectionStatus
    readonly: ConnectionStatus
    discovered_tables: list[str]

