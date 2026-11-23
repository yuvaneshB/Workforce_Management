"""Read-only repository for shift calendar constructed from shift_master and attendance dates."""

import datetime as dt
from types import SimpleNamespace

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.attendance import WorkforceAttendance
from app.models.shift_master import ShiftMaster


def list_shifts(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    is_working_day: bool | None = None,
    sort_by: str = "calendar_date",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list, int]:
    """Fetch paginated shift entries dynamically from shift_master and attendance_transactions."""
    stmt = (
        select(
            WorkforceAttendance.work_date,
            WorkforceAttendance.shift_id,
            ShiftMaster.start_time,
            ShiftMaster.end_time,
            ShiftMaster.planned_minutes,
            ShiftMaster.break_minutes,
        )
        .join(ShiftMaster, WorkforceAttendance.shift_id == ShiftMaster.shift_id)
        .group_by(
            WorkforceAttendance.work_date,
            WorkforceAttendance.shift_id,
            ShiftMaster.start_time,
            ShiftMaster.end_time,
            ShiftMaster.planned_minutes,
            ShiftMaster.break_minutes,
        )
    )
    count_stmt = select(func.count(func.distinct(WorkforceAttendance.work_date, WorkforceAttendance.shift_id))).select_from(WorkforceAttendance)

    filters = []
    if start_date is not None:
        filters.append(WorkforceAttendance.work_date >= start_date)
    if end_date is not None:
        filters.append(WorkforceAttendance.work_date <= end_date)
    if shift_id:
        filters.append(WorkforceAttendance.shift_id == shift_id)

    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    order_fn = desc if sort_order == "desc" else lambda x: x
    stmt = stmt.order_by(order_fn(WorkforceAttendance.work_date), order_fn(WorkforceAttendance.shift_id)).limit(limit).offset(offset)

    total = int(db.execute(count_stmt).scalar_one())
    rows = db.execute(stmt).all()

    items = []
    for r in rows:
        wdate = r[0]
        sid = r[1]
        st_parts = [int(p) for p in (r[2] or "06:00").split(":")]
        et_parts = [int(p) for p in (r[3] or "14:00").split(":")]
        s_start = dt.datetime.combine(wdate, dt.time(st_parts[0], st_parts[1]))
        s_end = dt.datetime.combine(wdate, dt.time(et_parts[0], et_parts[1]))
        if s_end <= s_start:
            s_end += dt.timedelta(days=1)
        items.append(
            SimpleNamespace(
                calendar_date=wdate,
                shift_id=sid,
                shift_start=s_start,
                shift_end=s_end,
                planned_minutes=int(r[4] or 420),
                break_minutes=int(r[5] or 30),
                is_working_day=True,
            )
        )
    return items, total
