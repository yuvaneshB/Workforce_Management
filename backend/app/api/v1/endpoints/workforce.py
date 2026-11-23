"""Read-only workforce and summary endpoints."""

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_readonly_db
from app.schemas.vendor_workforce import VendorWorkforceOverviewResponse
from app.schemas.workforce import (
    WorkforceListResponse,
    WorkforceRecord,
    WorkforceSummaryResponse,
)
from app.services import workforce_service

router = APIRouter(tags=["Workforce"])


@router.get(
    "/employees",
    response_model=WorkforceListResponse,
    summary="List workforce employees",
)
def list_employees(
    search: str | None = Query(default=None, description="Search by employee_id, team_id, role, or certification"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-TN-01, IN-KA-01, IN-TN-02)"),
    team_id: str | None = Query(default=None, description="Filter by team_id (e.g. TEAM-01)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    vendor_id: str | None = Query(default=None, description="Filter by vendor_id (e.g. V01)"),
    employment_type: str | None = Query(default=None, description="Filter by employment_type (Vendor, Permanent)"),
    role: str | None = Query(default=None, description="Filter by workforce role"),
    skill_grade: str | None = Query(default=None, description="Filter by skill_grade (e.g. L1-L4)"),
    certification: str | None = Query(default=None, description="Filter by certification"),
    home_shift: str | None = Query(default=None, description="Filter by home_shift (A, B, C)"),
    active_status: str | None = Query(default=None, description="Filter by active_status"),
    sort_by: Literal[
        "employee_id",
        "team_id",
        "role",
        "skill_grade",
        "certification",
        "home_shift",
        "active_status",
    ] = Query(default="employee_id"),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_readonly_db),
) -> WorkforceListResponse:
    """Retrieve paginated employee records from public.employee_master."""
    return workforce_service.list_employees(
        db,
        search=search,
        plant_id=plant_id,
        team_id=team_id,
        department_id=department_id,
        section_id=section_id,
        vendor_id=vendor_id,
        employment_type=employment_type,
        role=role,
        skill_grade=skill_grade,
        certification=certification,
        home_shift=home_shift,
        active_status=active_status,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/employees/{employee_id}",
    response_model=WorkforceRecord,
    summary="Get employee by ID",
)
def get_employee(
    employee_id: str = Path(..., min_length=1, max_length=32),
    db: Session = Depends(get_readonly_db),
) -> WorkforceRecord:
    """Retrieve a single employee record by employee_id."""
    record = workforce_service.get_employee(db, employee_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{employee_id}' was not found.",
        )
    return record


@router.get(
    "/workforce/summary",
    response_model=WorkforceSummaryResponse,
    summary="Get aggregated workforce summary",
)
def get_workforce_summary(
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-TN-01, IN-KA-01, IN-TN-02)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    employment_type: str | None = Query(default=None, description="Filter by employment_type (Permanent, Vendor)"),
    vendor_id: str | None = Query(default=None, description="Filter by vendor_id (e.g. V01)"),
    db: Session = Depends(get_readonly_db),
) -> WorkforceSummaryResponse:
    """Return workforce counts and data coverage windows from Neon, optionally filtered by dimensions."""
    return workforce_service.get_workforce_summary(
        db,
        plant_id=plant_id,
        department_id=department_id,
        section_id=section_id,
        shift_id=shift_id,
        employment_type=employment_type,
        vendor_id=vendor_id,
    )


@router.get(
    "/workforce/vendor-overview",
    response_model=VendorWorkforceOverviewResponse,
    summary="Get vendor workforce overview, directory, allocation, attendance, and attrition",
)
def get_vendor_workforce_overview(
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-TN-01, IN-KA-01)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id"),
    vendor_id: str | None = Query(default=None, description="Filter by vendor_id (e.g. V01)"),
    start_date: dt.date | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    period: Literal["daily", "weekly", "monthly"] = Query(default="daily", description="Attendance trend period grouping"),
    db: Session = Depends(get_readonly_db),
) -> VendorWorkforceOverviewResponse:
    """Return consolidated vendor workforce KPIs, directory, allocation, attendance, and attrition."""
    return workforce_service.get_vendor_workforce_overview(
        db,
        plant_id=plant_id,
        department_id=department_id,
        section_id=section_id,
        shift_id=shift_id,
        vendor_id=vendor_id,
        start_date=start_date,
        end_date=end_date,
        period=period,
    )

