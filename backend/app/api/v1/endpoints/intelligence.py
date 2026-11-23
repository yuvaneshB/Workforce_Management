"""Workforce Intelligence API endpoints (Phase 7.1).

Provides read-only operational intelligence endpoints:
- GET /api/v1/intelligence/single-person-dependency
- GET /api/v1/intelligence/labour-compliance
"""

import datetime as dt
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.data_mapping import get_all_valid_plant_ids
from app.core.database import get_readonly_db
from app.services import intelligence_service

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])

VALID_PLANTS = get_all_valid_plant_ids()
VALID_SHIFTS = {"A", "B", "C", "GS1", "S2", "NS3"}


@router.get(
    "/single-person-dependency",
    summary="Get single-person dependency risk analysis",
    description="Analyze active workforce roles and certifications to identify high single-person dependency risk.",
)
def get_single_person_dependency(
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-KA-01, IN-TN-01)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C or GS1, S2, NS3)"),
    date: dt.date | None = Query(default=None, description="Target date in YYYY-MM-DD format (defaults to latest available)"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    """Return single-person dependency analysis grouped by plant, role, and certification."""
    if plant_id and plant_id not in VALID_PLANTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plant_id '{plant_id}'. Valid plants: {sorted(VALID_PLANTS)}.",
        )
    if shift_id and shift_id.upper() not in VALID_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid shift_id '{shift_id}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
        )

    return intelligence_service.get_single_person_dependency(
        db,
        plant_id=plant_id,
        shift_id=shift_id,
        date=date,
    )


@router.get(
    "/labour-compliance",
    summary="Get labour and rest turnaround compliance audit",
    description="Audit attendance records for daily overtime, weekly hours, and rest turnaround interval compliance.",
)
def get_labour_compliance(
    plant_id: str | None = Query(default=None, description="Filter by plant_id (e.g. IN-KA-01, IN-TN-01)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C or GS1, S2, NS3)"),
    date: dt.date | None = Query(default=None, description="Single target date in YYYY-MM-DD format"),
    start_date: dt.date | None = Query(default=None, description="Start date in YYYY-MM-DD format"),
    end_date: dt.date | None = Query(default=None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_readonly_db),
) -> dict[str, Any]:
    """Return labor compliance exceptions, applied rules, and unconfigured rules."""
    if plant_id and plant_id not in VALID_PLANTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plant_id '{plant_id}'. Valid plants: {sorted(VALID_PLANTS)}.",
        )
    if shift_id and shift_id.upper() not in VALID_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid shift_id '{shift_id}'. Valid shifts: {sorted(VALID_SHIFTS)}.",
        )

    return intelligence_service.get_labour_compliance(
        db,
        plant_id=plant_id,
        shift_id=shift_id,
        date=date,
        start_date=start_date,
        end_date=end_date,
    )

