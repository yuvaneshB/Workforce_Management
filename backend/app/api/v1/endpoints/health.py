"""Health and database connectivity endpoints."""

from fastapi import APIRouter, Depends, Response, status

from app.core.config import Settings, get_settings
from app.core.database import db_manager
from app.schemas.health import DatabaseHealthResponse, HealthResponse
from app.services.health_service import check_database_health, get_api_health

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="API health check")
def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Verify the FastAPI service is running."""
    return get_api_health(settings)


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    summary="Neon PostgreSQL connectivity check",
)
@router.get(
    "/database/status",
    response_model=DatabaseHealthResponse,
    summary="Neon PostgreSQL database status",
)
def database_health_check(
    response: Response,
    settings: Settings = Depends(get_settings),
) -> DatabaseHealthResponse:
    """Verify primary and read-only Neon PostgreSQL connectivity and list existing tables."""
    result = check_database_health(db_manager, settings)
    if result.status != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return result
