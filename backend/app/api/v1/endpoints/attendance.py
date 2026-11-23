"""Read-only attendance endpoints."""

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_readonly_db
from app.schemas.attendance import AttendanceListResponse
from app.services import attendance_service

router = APIRouter(tags=["Attendance"])


@router.get(
    "/attendance",
    response_model=AttendanceListResponse,
    summary="List workforce attendance records",
)
def list_attendance(
    search: str | None = Query(default=None, description="Search by employee_id, attendance_id, or plant_id"),
    start_date: dt.date | None = Query(default=None, description="Inclusive start work_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end work_date (YYYY-MM-DD)"),
    employee_id: str | None = Query(default=None, description="Filter by employee_id"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    attendance_status: str | None = Query(default=None, description="Filter by attendance_status"),
    skill_match: str | None = Query(default=None, description="Filter by skill_match"),
    training_compliance: str | None = Query(default=None, description="Filter by training_compliance"),
    sort_by: Literal[
        "attendance_id",
        "work_date",
        "employee_id",
        "plant_id",
        "shift_id",
        "attendance_status",
        "actual_hours",
        "overtime_hours",
    ] = Query(default="work_date"),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_readonly_db),
) -> AttendanceListResponse:
    """Retrieve paginated attendance records with separate data-quality warnings."""
    return attendance_service.list_attendance(
        db,
        search=search,
        start_date=start_date,
        end_date=end_date,
        employee_id=employee_id,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        attendance_status=attendance_status,
        skill_match=skill_match,
        training_compliance=training_compliance,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

