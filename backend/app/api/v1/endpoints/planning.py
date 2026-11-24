"""Workforce Planning API endpoints (Phase 2).

Provides read-only operational planning endpoints:
- GET /api/v1/planning/availability
- GET /api/v1/planning/shortages
- GET /api/v1/planning/recommendations
"""

import datetime as dt
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.data_mapping import get_all_valid_plant_ids
from app.core.database import get_readonly_db
from app.services import workforce_planning_service

router = APIRouter(prefix="/planning", tags=["Planning"])

VALID_PLANTS = get_all_valid_plant_ids()
VALID_SHIFTS = {"A", "B", "C"}


@router.get(
    "/availability",
    summary="Get workforce availability",
    description="Calculate workforce availability distinguishing PRESENT, ABSENT, LEAVE, and LATE statuses.",
)
def get_workforce_availability(
    date: dt.date = Query(..., description="Target work_date in YYYY-MM-DD format"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-KA-01, IN-TN-01)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    department_id: str | None = Query(default=None, description="Filter by department_id (e.g. DEPT-01)"),
    section_id: str | None = Query(default=None, description="Filter by section_id (e.g. SEC-01)"),
    employment_type: str | None = Query(default=None, description="Filter by employment_type (Permanent, Vendor)"),
    vendor_id: str | None = Query(default=None, description="Filter by vendor_id (e.g. V01)"),
    team_id: str | None = Query(default=None, description="Filter by team_id (e.g. TEAM-01)"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    """Return date-specific workforce availability breakdown."""
    if plant_id and plant_id not in VALID_PLANTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plant_id '{plant_id}'. Valid plants: {sorted(VALID_PLANTS)}.",
        )
    if shift_id and shift_id not in VALID_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid shift_id '{shift_id}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
        )

    return workforce_planning_service.calculate_workforce_availability(
        db,
        target_date=date,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        employment_type=employment_type,
        vendor_id=vendor_id,
        team_id=team_id,
    )


@router.get(
    "/shortages",
    summary="Detect workforce shortages",
    description="Calculate workforce shortages against the verified 10-person-team and 30-person-plant-shift baseline.",
)
def get_workforce_shortages(
    date: dt.date = Query(..., description="Target work_date in YYYY-MM-DD format"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-KA-01, IN-TN-01)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    department_id: str | None = Query(default=None, description="Filter by department_id"),
    section_id: str | None = Query(default=None, description="Filter by section_id"),
    employment_type: str | None = Query(default=None, description="Filter by employment_type (Permanent, Vendor)"),
    vendor_id: str | None = Query(default=None, description="Filter by vendor_id (e.g. V01)"),
    team_id: str | None = Query(default=None, description="Filter by team_id (e.g. TEAM-01)"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    """Detect plant/shift workforce shortages against operational staffing baselines."""
    if plant_id and plant_id not in VALID_PLANTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plant_id '{plant_id}'. Valid plants: {sorted(VALID_PLANTS)}.",
        )
    if shift_id and shift_id not in VALID_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid shift_id '{shift_id}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
        )

    return workforce_planning_service.detect_workforce_shortages(
        db,
        target_date=date,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        employment_type=employment_type,
        vendor_id=vendor_id,
        team_id=team_id,
    )


@router.get(
    "/recommendations",
    summary="Get employee replacement recommendations",
    description="Identify, filter, and deterministically rank eligible replacement candidates for an absent worker.",
)
def get_replacement_recommendations(
    employee_id: str = Query(..., description="Absent employee ID (e.g. EMP-0018)"),
    date: dt.date = Query(..., description="Target work_date in YYYY-MM-DD format"),
    target_shift: str | None = Query(default=None, description="Optional target shift (A, B, C)"),
    mandatory_certification: bool = Query(
        default=True,
        description="Whether to enforce mandatory certification match with absent employee",
    ),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    """Return scored and ranked replacement candidates for an absent employee."""
    if target_shift and target_shift not in VALID_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target_shift '{target_shift}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
        )

    result = workforce_planning_service.recommend_replacement_candidates(
        db,
        absent_employee_id=employee_id,
        target_date=date,
        target_shift=target_shift,
        mandatory_certification=mandatory_certification,
    )

    if result.get("absent_employee") is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{employee_id}' not found.",
        )

    return result

