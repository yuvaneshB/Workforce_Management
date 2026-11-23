"""Read-only hourly production endpoints."""

import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_readonly_db
from app.schemas.production import ProductionListResponse
from app.services import production_service

router = APIRouter(tags=["Production"])


@router.get(
    "/production",
    response_model=ProductionListResponse,
    summary="List hourly production events",
)
def list_production(
    start_date: dt.date | None = Query(default=None, description="Inclusive start event_date (YYYY-MM-DD)"),
    end_date: dt.date | None = Query(default=None, description="Inclusive end event_date (YYYY-MM-DD)"),
    plant_id: str | None = Query(default=None, description="Filter by plant_id"),
    line_id: str | None = Query(default=None, description="Filter by line_id"),
    shift_id: str | None = Query(default=None, description="Filter by shift_id (A, B, C)"),
    product_id: str | None = Query(default=None, description="Filter by product_id"),
    production_order_id: str | None = Query(default=None, description="Filter by production_order_id"),
    operator_team: str | None = Query(default=None, description="Filter by operator_team"),
    downtime_reason: str | None = Query(default=None, description="Filter by downtime_reason"),
    sort_by: Literal[
        "event_id",
        "event_ts",
        "event_date",
        "plant_id",
        "line_id",
        "shift_id",
        "target_qty",
        "actual_qty",
        "downtime_min",
    ] = Query(default="event_ts"),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_readonly_db),
) -> ProductionListResponse:
    """Retrieve paginated production events from public.fact_hourly_production."""
    return production_service.list_production(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        line_id=line_id,
        shift_id=shift_id,
        product_id=product_id,
        production_order_id=production_order_id,
        operator_team=operator_team,
        downtime_reason=downtime_reason,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

