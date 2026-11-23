"""Read-only shift calendar endpoints."""

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_readonly_db
from app.schemas.shift_calendar import ShiftCalendarListResponse
from app.services import shift_calendar_service

router = APIRouter(tags=["Shifts"])


@router.get(
    "/shifts",
    response_model=ShiftCalendarListResponse,
    summary="List shift calendar entries",
)
def list_shifts(
    start_date: dt.date | None = Query(default=None, description="Inclusive start calendar_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end calendar_date (YYYY-MM-DD)"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    is_working_day: bool | None = Query(default=None, description="Filter by is_working_day"),
    sort_by: Literal[
        "calendar_date",
        "shift_id",
        "shift_start",
        "shift_end",
        "planned_minutes",
    ] = Query(default="calendar_date"),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_readonly_db),
) -> ShiftCalendarListResponse:
    """Retrieve paginated shift calendar rows from public.dim_shift_calendar."""
    return shift_calendar_service.list_shifts(
        db,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        is_working_day=is_working_day,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

