"""Service layer for hourly production retrieval and analytics."""

import datetime as dt

from sqlalchemy.orm import Session

from app.repositories import production_repository
from app.schemas.production import (
    DowntimeReasonBreakdown,
    ProductionAnalyticsResponse,
    ProductionListResponse,
    ProductionPlantLineBreakdown,
    ProductionProductBreakdown,
    ProductionRecord,
    ProductionShiftBreakdown,
)
from app.utils.query_helpers import build_pagination_meta, validate_date_range


def list_production(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    line_id: str | None = None,
    shift_id: str | None = None,
    product_id: str | None = None,
    production_order_id: str | None = None,
    operator_team: str | None = None,
    downtime_reason: str | None = None,
    sort_by: str = "event_ts",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> ProductionListResponse:
    """Return paginated hourly production records."""
    validate_date_range(start_date, end_date)
    items, total = production_repository.list_production(
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
    records = [ProductionRecord.model_validate(item) for item in items]
    return ProductionListResponse(
        items=records,
        pagination=build_pagination_meta(
            total=total,
            limit=limit,
            offset=offset,
            returned=len(records),
        ),
    )


def get_production_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    line_id: str | None = None,
    shift_id: str | None = None,
    operator_team: str | None = None,
) -> ProductionAnalyticsResponse:
    """Return aggregated production metrics derived from stored columns."""
    validate_date_range(start_date, end_date)
    raw = production_repository.get_production_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        line_id=line_id,
        shift_id=shift_id,
        operator_team=operator_team,
    )
    return ProductionAnalyticsResponse(
        total_events=raw["total_events"],
        distinct_orders=raw["distinct_orders"],
        total_target_qty=raw["total_target_qty"],
        total_actual_qty=raw["total_actual_qty"],
        total_good_qty=raw["total_good_qty"],
        total_reject_qty=raw["total_reject_qty"],
        total_rework_qty=raw["total_rework_qty"],
        total_downtime_min=raw["total_downtime_min"],
        by_plant_line=[ProductionPlantLineBreakdown(**item) for item in raw["by_plant_line"]],
        by_shift=[ProductionShiftBreakdown(**item) for item in raw["by_shift"]],
        by_downtime_reason=[DowntimeReasonBreakdown(**item) for item in raw["by_downtime_reason"]],
        by_product=[ProductionProductBreakdown(**item) for item in raw["by_product"]],
    )

