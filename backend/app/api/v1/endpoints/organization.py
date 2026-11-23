"""Read-only endpoints for departments and sections."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_readonly_db
from app.schemas.organization import (
    DepartmentListResponse,
    SectionListResponse,
)
from app.services import organization_service

router = APIRouter(tags=["Organization"])


@router.get("/departments", response_model=DepartmentListResponse, summary="List departments")
def list_departments(
    plant_id: str | None = Query(default=None, description="Filter departments having active employees in plant"),
    search: str | None = Query(default=None, description="Search by department_id or department_name"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_readonly_db),
) -> DepartmentListResponse:
    """List departments and assigned employee counts when department tables exist in Neon."""
    return organization_service.list_departments(
        db, plant_id=plant_id, search=search, limit=limit, offset=offset
    )


@router.get("/sections", response_model=SectionListResponse, summary="List sections")
def list_sections(
    department_id: str | None = Query(default=None, description="Filter sections belonging to department"),
    plant_id: str | None = Query(default=None, description="Filter sections having active employees in plant"),
    search: str | None = Query(default=None, description="Search by section_id or section_name"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_readonly_db),
) -> SectionListResponse:
    """List sections and assigned employee counts when section tables exist in Neon."""
    return organization_service.list_sections(
        db,
        department_id=department_id,
        plant_id=plant_id,
        search=search,
        limit=limit,
        offset=offset,
    )

