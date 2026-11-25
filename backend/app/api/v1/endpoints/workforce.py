"""Read-only workforce and summary endpoints."""

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db, get_readonly_db
from app.schemas.vendor_workforce import VendorWorkforceOverviewResponse
from app.schemas.workforce import (
    EmployeeCreateOptionsResponse,
    EmployeeCreateRequest,
    EmployeeCreateResponse,
    EmployeeExitOptionsResponse,
    EmployeeReinstateResponse,
    EmployeeRelieveRequest,
    EmployeeRelieveResponse,
    EmployeeSearchResult,
    RelievedEmployeeItem,
    WorkforceListResponse,
    WorkforceRecord,
    WorkforceSummaryResponse,
)
from app.services import (
    employee_create_service,
    employee_relieve_service,
    workforce_service,
)

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
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
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
        home_shift=shift_id or home_shift,
        active_status=active_status,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/workforce/employees/options",
    response_model=EmployeeCreateOptionsResponse,
    summary="Get data-driven dropdown options for Add Employee form",
)
@router.get(
    "/employees/create/options",
    response_model=EmployeeCreateOptionsResponse,
    summary="Get data-driven dropdown options for Add Employee form (alias)",
)
def get_employee_create_options(
    db: Session = Depends(get_readonly_db),
) -> EmployeeCreateOptionsResponse:
    """Return data-driven dropdown options (plants, departments, sections, shifts, vendors, designations, bands)."""
    return employee_create_service.get_employee_create_options(db)


@router.post(
    "/workforce/employees",
    response_model=EmployeeCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee atomically across 4 tables",
)
@router.post(
    "/employees/create",
    response_model=EmployeeCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee atomically across 4 tables (alias)",
)
def create_employee(
    data: EmployeeCreateRequest,
    db: Session = Depends(get_db),
) -> EmployeeCreateResponse:
    """Validate, compute fields, and insert new employee into 4 tables in a single transaction."""
    return employee_create_service.create_employee(db, data)


@router.get(
    "/workforce/employees/search",
    response_model=list[EmployeeSearchResult],
    summary="Search active employees by ID or name",
)
@router.get(
    "/employees/search",
    response_model=list[EmployeeSearchResult],
    summary="Search active employees by ID or name (alias)",
)
def search_employees(
    q: str = Query(default="", description="Search query by ID or name"),
    status: str = Query(default="Active", description="Filter by employment status"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
    db: Session = Depends(get_readonly_db),
) -> list[EmployeeSearchResult]:
    """Search active employees for the Relieve Employee tab."""
    return employee_relieve_service.search_active_employees(db, q=q, status_filter=status, limit=limit)


@router.get(
    "/workforce/employees/exit-options",
    response_model=EmployeeExitOptionsResponse,
    summary="Get data-driven exit types and reasons from Neon DB",
)
@router.get(
    "/employees/exit-options",
    response_model=EmployeeExitOptionsResponse,
    summary="Get data-driven exit types and reasons from Neon DB (alias)",
)
def get_exit_options(
    db: Session = Depends(get_readonly_db),
) -> EmployeeExitOptionsResponse:
    """Retrieve distinct exit types and exit reasons directly from Neon PostgreSQL."""
    return employee_relieve_service.get_exit_options(db)


@router.get(
    "/workforce/employees/relieved",
    response_model=list[RelievedEmployeeItem],
    summary="Get recently relieved employees",
)
@router.get(
    "/employees/relieved",
    response_model=list[RelievedEmployeeItem],
    summary="Get recently relieved employees (alias)",
)
def get_recently_relieved(
    limit: int = Query(default=20, ge=1, le=100, description="Max results"),
    db: Session = Depends(get_readonly_db),
) -> list[RelievedEmployeeItem]:
    """Retrieve recently relieved employees."""
    return employee_relieve_service.get_recently_relieved(db, limit=limit)


@router.post(
    "/workforce/employees/{employee_id}/relieve",
    response_model=EmployeeRelieveResponse,
    summary="Relieve an active employee and record attrition in Neon DB",
)
@router.post(
    "/employees/{employee_id}/relieve",
    response_model=EmployeeRelieveResponse,
    summary="Relieve an active employee and record attrition in Neon DB (alias)",
)
def relieve_employee(
    employee_id: str = Path(..., min_length=1, max_length=32),
    data: EmployeeRelieveRequest = ...,
    db: Session = Depends(get_db),
) -> EmployeeRelieveResponse:
    """Mark employee as Resigned and record AttritionTransaction in an atomic transaction."""
    return employee_relieve_service.relieve_employee(db, employee_id=employee_id, data=data)


@router.post(
    "/workforce/employees/{employee_id}/reinstate",
    response_model=EmployeeReinstateResponse,
    summary="Safety action to reinstate a mistakenly relieved employee back to Active",
)
@router.post(
    "/employees/{employee_id}/reinstate",
    response_model=EmployeeReinstateResponse,
    summary="Safety action to reinstate a mistakenly relieved employee back to Active (alias)",
)
def reinstate_employee(
    employee_id: str = Path(..., min_length=1, max_length=32),
    db: Session = Depends(get_db),
) -> EmployeeReinstateResponse:
    """Reinstate a relieved employee back to Active and clear exit record."""
    return employee_relieve_service.reinstate_employee(db, employee_id=employee_id)



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
    team_id: str | None = Query(default=None, description="Filter by team_id (e.g. TEAM-01)"),
    start_date: dt.date | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="End date (YYYY-MM-DD)"),
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
        team_id=team_id,
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

