"""Top-level API v1 router."""

from fastapi import APIRouter

from app.api.v1.endpoints.agent import router as agent_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.attendance import router as attendance_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.hr_approvals import router as hr_approvals_router
from app.api.v1.endpoints.intelligence import router as intelligence_router
from app.api.v1.endpoints.organization import router as organization_router
from app.api.v1.endpoints.planning import router as planning_router
from app.api.v1.endpoints.production import router as production_router
from app.api.v1.endpoints.shifts import router as shifts_router
from app.api.v1.endpoints.workforce import router as workforce_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(workforce_router)
api_router.include_router(attendance_router)
api_router.include_router(shifts_router)
api_router.include_router(production_router)
api_router.include_router(analytics_router)
api_router.include_router(organization_router)
api_router.include_router(planning_router)
api_router.include_router(intelligence_router)
api_router.include_router(agent_router)
api_router.include_router(hr_approvals_router)
