"""Read-only repository for public.production_transactions."""

import datetime as dt

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.models.production import HourlyProduction

ALLOWED_PRODUCTION_SORT_COLUMNS = {
    "event_id": HourlyProduction.production_id,
    "production_id": HourlyProduction.production_id,
    "event_ts": HourlyProduction.work_date,
    "event_date": HourlyProduction.work_date,
    "work_date": HourlyProduction.work_date,
    "plant_id": HourlyProduction.plant_id,
    "line_id": HourlyProduction.line_id,
    "shift_id": HourlyProduction.shift_id,
    "target_qty": HourlyProduction.target_units,
    "actual_qty": HourlyProduction.actual_units,
    "target_units": HourlyProduction.target_units,
    "actual_units": HourlyProduction.actual_units,
    "downtime_min": HourlyProduction.downtime_minutes,
    "downtime_minutes": HourlyProduction.downtime_minutes,
}


def _build_production_filters(
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
) -> list:
    filters = []
    if start_date is not None:
        filters.append(HourlyProduction.work_date >= start_date)
    if end_date is not None:
        filters.append(HourlyProduction.work_date <= end_date)
    if plant_id:
        filters.append(HourlyProduction.plant_id == plant_id)
    if line_id:
        filters.append(HourlyProduction.line_id == line_id)
    if shift_id:
        filters.append(HourlyProduction.shift_id == shift_id)
    if product_id:
        filters.append(HourlyProduction.product_id == product_id)
    return filters


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
    sort_by: str = "work_date",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[HourlyProduction], int]:
    """Fetch paginated production records filtered by actual columns."""
    filters = _build_production_filters(
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        line_id=line_id,
        shift_id=shift_id,
        product_id=product_id,
        production_order_id=production_order_id,
        operator_team=operator_team,
        downtime_reason=downtime_reason,
    )

    stmt = select(HourlyProduction)
    count_stmt = select(func.count()).select_from(HourlyProduction)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    sort_col = ALLOWED_PRODUCTION_SORT_COLUMNS.get(sort_by, HourlyProduction.work_date)
    order_fn = desc if sort_order == "desc" else asc
    stmt = (
        stmt.order_by(order_fn(sort_col), asc(HourlyProduction.production_id))
        .limit(limit)
        .offset(offset)
    )

    total = int(db.execute(count_stmt).scalar_one())
    items = list(db.execute(stmt).scalars().all())
    return items, total


def get_production_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    line_id: str | None = None,
    shift_id: str | None = None,
    operator_team: str | None = None,
) -> dict:
    """Compute stored production quantity and downtime aggregations from Neon."""
    filters = _build_production_filters(
        start_date=start_date,
        end_date=end_date,
        plant_id=plant_id,
        line_id=line_id,
        shift_id=shift_id,
        operator_team=operator_team,
    )

    totals_stmt = select(
        func.count(),
        func.count(func.distinct(HourlyProduction.product_id)),
        func.coalesce(func.sum(HourlyProduction.target_units), 0),
        func.coalesce(func.sum(HourlyProduction.actual_units), 0),
        func.coalesce(func.sum(HourlyProduction.good_units), 0),
        func.coalesce(func.sum(HourlyProduction.rejected_units), 0),
        func.coalesce(func.sum(HourlyProduction.rework_units), 0),
        func.coalesce(func.sum(HourlyProduction.downtime_minutes), 0),
    ).select_from(HourlyProduction)
    if filters:
        totals_stmt = totals_stmt.where(*filters)

    (
        total_events,
        distinct_orders,
        target_qty,
        actual_qty,
        good_qty,
        reject_qty,
        rework_qty,
        downtime_min,
    ) = db.execute(totals_stmt).one()

    plant_line_stmt = (
        select(
            HourlyProduction.plant_id,
            HourlyProduction.line_id,
            func.count(),
            func.coalesce(func.sum(HourlyProduction.target_units), 0),
            func.coalesce(func.sum(HourlyProduction.actual_units), 0),
            func.coalesce(func.sum(HourlyProduction.good_units), 0),
            func.coalesce(func.sum(HourlyProduction.rejected_units), 0),
            func.coalesce(func.sum(HourlyProduction.rework_units), 0),
            func.coalesce(func.sum(HourlyProduction.downtime_minutes), 0),
        )
        .group_by(HourlyProduction.plant_id, HourlyProduction.line_id)
        .order_by(asc(HourlyProduction.plant_id), asc(HourlyProduction.line_id))
    )
    if filters:
        plant_line_stmt = plant_line_stmt.where(*filters)
    by_plant_line = [
        {
            "plant_id": str(r[0]),
            "line_id": str(r[1]),
            "event_count": int(r[2]),
            "target_qty": int(r[3]),
            "actual_qty": int(r[4]),
            "good_qty": int(r[5]),
            "reject_qty": int(r[6]),
            "rework_qty": int(r[7]),
            "downtime_min": int(r[8]),
        }
        for r in db.execute(plant_line_stmt).all()
    ]

    shift_stmt = (
        select(
            HourlyProduction.shift_id,
            func.count(),
            func.coalesce(func.sum(HourlyProduction.target_units), 0),
            func.coalesce(func.sum(HourlyProduction.actual_units), 0),
            func.coalesce(func.sum(HourlyProduction.good_units), 0),
            func.coalesce(func.sum(HourlyProduction.rejected_units), 0),
            func.coalesce(func.sum(HourlyProduction.rework_units), 0),
            func.coalesce(func.sum(HourlyProduction.downtime_minutes), 0),
        )
        .group_by(HourlyProduction.shift_id)
        .order_by(asc(HourlyProduction.shift_id))
    )
    if filters:
        shift_stmt = shift_stmt.where(*filters)
    by_shift = [
        {
            "shift_id": str(r[0]),
            "event_count": int(r[1]),
            "target_qty": int(r[2]),
            "actual_qty": int(r[3]),
            "good_qty": int(r[4]),
            "reject_qty": int(r[5]),
            "rework_qty": int(r[6]),
            "downtime_min": int(r[7]),
        }
        for r in db.execute(shift_stmt).all()
    ]

    product_stmt = (
        select(
            HourlyProduction.product_id,
            func.count(),
            func.coalesce(func.sum(HourlyProduction.target_units), 0),
            func.coalesce(func.sum(HourlyProduction.actual_units), 0),
            func.coalesce(func.sum(HourlyProduction.good_units), 0),
            func.coalesce(func.sum(HourlyProduction.rejected_units), 0),
            func.coalesce(func.sum(HourlyProduction.rework_units), 0),
        )
        .group_by(HourlyProduction.product_id)
        .order_by(asc(HourlyProduction.product_id))
    )
    if filters:
        product_stmt = product_stmt.where(*filters)
    by_product = [
        {
            "product_id": str(r[0]),
            "event_count": int(r[1]),
            "target_qty": int(r[2]),
            "actual_qty": int(r[3]),
            "good_qty": int(r[4]),
            "reject_qty": int(r[5]),
            "rework_qty": int(r[6]),
        }
        for r in db.execute(product_stmt).all()
    ]

    return {
        "total_events": int(total_events),
        "distinct_orders": int(distinct_orders),
        "total_target_qty": int(target_qty),
        "total_actual_qty": int(actual_qty),
        "total_good_qty": int(good_qty),
        "total_reject_qty": int(reject_qty),
        "total_rework_qty": int(rework_qty),
        "total_downtime_min": int(downtime_min),
        "by_plant_line": by_plant_line,
        "by_shift": by_shift,
        "by_downtime_reason": [],
        "by_product": by_product,
    }
