"""FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.database import DatabaseNotConfiguredError, db_manager
from app.core.logging import configure_logging
from app.schemas.health import HealthResponse
from app.services.health_service import get_api_health

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage FastAPI startup and shutdown lifecycle."""
    logger.info("Starting %s in %s mode", settings.app_name, settings.app_env)
    yield
    db_manager.dispose()
    logger.info("Disposed database connection pools cleanly")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

cors_origins = settings.cors_origin_list

if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    )


@app.exception_handler(ValueError)
async def handle_validation_value_error(_request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": str(exc)},
    )


@app.exception_handler(DatabaseNotConfiguredError)
async def handle_db_not_configured(_request: Request, exc: DatabaseNotConfiguredError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": str(exc)},
    )


@app.exception_handler(SQLAlchemyError)
async def handle_sqlalchemy_error(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error("Database query error: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "A database service error occurred."},
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error in request: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Application health check",
)
@app.get(
    "/healthz",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Kubernetes liveness probe",
)
@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="API health check alias",
)
def root_health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Verify application health and availability."""
    return get_api_health(settings)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    """Root metadata endpoint."""
    return {
        "service": settings.app_name,
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "api_v1_health": f"{settings.api_v1_prefix}/health",
        "database_health": f"{settings.api_v1_prefix}/health/db",
        "database_status": f"{settings.api_v1_prefix}/database/status",
        "agent_chat": f"{settings.api_v1_prefix}/agent/chat",
    }
