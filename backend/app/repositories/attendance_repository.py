"""Read-only repository for public.attendance_transactions."""

import datetime as dt

from sqlalchemy import asc, case, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.attendance import WorkforceAttendance
from app.models.department import DepartmentMaster
from app.models.employee_master import EmployeeMaster
from app.models.section import EmployeeSectionMapping

ALLOWED_ATTENDANCE_SORT_COLUMNS = {
    "attendance_id": WorkforceAttendance.attendance_id,
    "work_date": WorkforceAttendance.work_date,
    "employee_id": WorkforceAttendance.employee_id,
    "plant_id": WorkforceAttendance.plant_id,
    "shift_id": WorkforceAttendance.shift_id,
    "attendance_status": WorkforceAttendance.attendance_status,
    "actual_hours": WorkforceAttendance.actual_hours,
    "overtime_hours": WorkforceAttendance.overtime_hours,
}


def _build_attendance_filters(
    *,
    search: str | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    employee_id: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    operator_team: str | None = None,
    attendance_status: str | None = None,
    skill_match: str | None = None,
    training_compliance: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
) -> list:
    filters = []
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                WorkforceAttendance.employee_id.ilike(pattern),
                WorkforceAttendance.attendance_id.ilike(pattern),
                WorkforceAttendance.plant_id.ilike(pattern),
            )
        )
    if start_date is not None:
        filters.append(WorkforceAttendance.work_date >= start_date)
    if end_date is not None:
        filters.append(WorkforceAttendance.work_date <= end_date)
    if employee_id:
        filters.append(WorkforceAttendance.employee_id == employee_id)
    if plant_id:
        filters.append(WorkforceAttendance.plant_id == plant_id)
    if shift_id:
        filters.append(WorkforceAttendance.shift_id == shift_id)
    if department_id:
        filters.append(WorkforceAttendance.department_id == department_id)
    target_sec = section_id or operator_team
    if target_sec:
        sec_targets = [target_sec]
        if target_sec.startswith("TEAM-"):
            sec_targets.append(target_sec.replace("TEAM-", "S0"))
        filters.append(
            WorkforceAttendance.employee_id.in_(
                select(EmployeeSectionMapping.employee_id).where(
                    EmployeeSectionMapping.section_id.in_(sec_targets)
                )
            )
        )
    if attendance_status:
        filters.append(func.upper(WorkforceAttendance.attendance_status) == attendance_status.upper())
    if employment_type and employment_type.strip():
        filters.append(
            WorkforceAttendance.employee_id.in_(
                select(EmployeeMaster.employee_id).where(
                    EmployeeMaster.employment_type.ilike(employment_type.strip())
                )
            )
        )
    if vendor_id and vendor_id.strip():
        filters.append(
            WorkforceAttendance.employee_id.in_(
                select(EmployeeMaster.employee_id).where(
                    EmployeeMaster.vendor_id == vendor_id.strip()
                )
            )
        )
    return filters


def _status_case_sum(status_value: str):
    return func.coalesce(
        func.sum(case((func.upper(WorkforceAttendance.attendance_status) == status_value.upper(), 1), else_=0)),
        0,
    )


def _format_trend_row(bucket_key, label: str, total: int, present: int, absent: int, late: int, leave: int) -> dict:
    att_pct = round((present * 100.0 / total), 1) if total > 0 else 0.0
    abs_pct = round((absent * 100.0 / total), 1) if total > 0 else 0.0
    return {
        "period_key": str(bucket_key),
        "label": label,
        "total_records": int(total),
        "present_count": int(present),
        "absent_count": int(absent),
        "late_count": int(late),
        "leave_count": int(leave),
        "attendance_pct": att_pct,
        "absenteeism_pct": abs_pct,
    }


def _query_attendance_trends(db: Session, filters: list, period: str) -> list[dict]:
    if period == "weekly":
        bucket_expr = func.date_trunc("week", WorkforceAttendance.work_date)
    elif period == "monthly":
        bucket_expr = func.date_trunc("month", WorkforceAttendance.work_date)
    else:
        bucket_expr = WorkforceAttendance.work_date

    stmt = (
        select(
            bucket_expr.label("bucket"),
            func.count().label("total"),
            _status_case_sum("PRESENT").label("present"),
            _status_case_sum("ABSENT").label("absent"),
            _status_case_sum("LATE").label("late"),
            _status_case_sum("LEAVE").label("leave"),
        )
        .group_by(bucket_expr)
        .order_by(asc(bucket_expr))
    )
    if filters:
        stmt = stmt.where(*filters)

    points = []
    for bucket, total, present, absent, late, leave in db.execute(stmt).all():
        if isinstance(bucket, dt.datetime):
            bucket_date = bucket.date()
        else:
            bucket_date = bucket
        if period == "monthly":
            key = bucket_date.strftime("%Y-%m")
            label = bucket_date.strftime("%b %Y")
        elif period == "weekly":
            key = bucket_date.isoformat()
            label = f"Wk {bucket_date.strftime('%m-%d')}"
        else:
            key = bucket_date.isoformat()
            label = bucket_date.strftime("%m-%d")
        points.append(_format_trend_row(key, label, total, present, absent, late, leave))
    return points


def _query_shift_breakdown(db: Session, filters: list) -> list[dict]:
    stmt = (
        select(
            WorkforceAttendance.shift_id,
            func.count(),
            _status_case_sum("PRESENT"),
            _status_case_sum("ABSENT"),
            _status_case_sum("LATE"),
            _status_case_sum("LEAVE"),
        )
        .group_by(WorkforceAttendance.shift_id)
        .order_by(asc(WorkforceAttendance.shift_id))
    )
    if filters:
        stmt = stmt.where(*filters)

    rows = []
    for shift_id, total, present, absent, late, leave in db.execute(stmt).all():
        att_pct = round((present * 100.0 / total), 1) if total > 0 else 0.0
        abs_pct = round((absent * 100.0 / total), 1) if total > 0 else 0.0
        rows.append(
            {
                "shift_id": str(shift_id),
                "total_records": int(total),
                "present_count": int(present),
                "absent_count": int(absent),
                "late_count": int(late),
                "leave_count": int(leave),
                "attendance_pct": att_pct,
                "absenteeism_pct": abs_pct,
            }
        )
    return rows


def _query_attendance_quality_counts(db: Session, filters: list) -> dict[str, int]:
    stmt = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        (func.upper(WorkforceAttendance.attendance_status) == "ABSENT")
                        & (WorkforceAttendance.actual_hours > 0),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (
                        (func.upper(WorkforceAttendance.attendance_status) == "LEAVE")
                        & (WorkforceAttendance.actual_hours > 0),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (
                        (func.upper(WorkforceAttendance.attendance_status) == "PRESENT")
                        & (WorkforceAttendance.actual_hours == 0),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (
                        (func.upper(WorkforceAttendance.attendance_status) == "LATE")
                        & (WorkforceAttendance.actual_hours == 0),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ),
    ).select_from(WorkforceAttendance)

    if filters:
        stmt = stmt.where(*filters)

    absent_gt0, leave_gt0, present_eq0, late_eq0 = db.execute(stmt).one()
    return {
        "absent_with_actual_hours": int(absent_gt0),
        "leave_with_actual_hours": int(leave_gt0),
        "present_with_zero_actual_hours": int(present_eq0),
        "late_with_zero_actual_hours": int(late_eq0),
    }


def list_attendance(
    db: Session,
    *,
    search: str | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    employee_id: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    attendance_status: str | None = None,
    skill_match: str | None = None,
    training_compliance: str | None = None,
    sort_by: str = "work_date",
    sort_order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[WorkforceAttendance], int, dict[str, int]]:
    """Fetch paginated attendance rows and data-quality counts without modifying records."""
    filters = _build_attendance_filters(
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
    )

    stmt = (
        select(
            WorkforceAttendance,
            EmployeeMaster.full_name,
            DepartmentMaster.department_name,
        )
        .outerjoin(EmployeeMaster, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .outerjoin(
            DepartmentMaster,
            WorkforceAttendance.department_id == DepartmentMaster.department_id,
        )
    )
    count_stmt = select(func.count()).select_from(WorkforceAttendance)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    sort_col = ALLOWED_ATTENDANCE_SORT_COLUMNS.get(sort_by, WorkforceAttendance.work_date)
    order_fn = desc if sort_order == "desc" else asc
    stmt = (
        stmt.order_by(order_fn(sort_col), asc(WorkforceAttendance.attendance_id))
        .limit(limit)
        .offset(offset)
    )

    total = int(db.execute(count_stmt).scalar_one())
    rows = db.execute(stmt).all()
    items = []
    for att, emp_name, dept_name in rows:
        setattr(att, "employee_name", emp_name)
        setattr(att, "department", dept_name)
        items.append(att)
    quality_counts = _query_attendance_quality_counts(db, filters)
    return items, total, quality_counts


def get_attendance_analytics(
    db: Session,
    *,
    period: str = "daily",
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    employee_id: str | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    operator_team: str | None = None,
    employment_type: str | None = None,
    vendor_id: str | None = None,
) -> dict:
    """Compute attendance totals, period trends, weekly comparison, shift breakdown, and warnings."""
    filters = _build_attendance_filters(
        start_date=start_date,
        end_date=end_date,
        employee_id=employee_id,
        plant_id=plant_id,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        operator_team=operator_team,
        employment_type=employment_type,
        vendor_id=vendor_id,
    )

    totals_stmt = select(
        func.count(),
        func.count(func.distinct(WorkforceAttendance.employee_id)),
        func.coalesce(func.sum(WorkforceAttendance.scheduled_hours), 0),
        func.coalesce(func.sum(WorkforceAttendance.actual_hours), 0),
        func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
    ).select_from(WorkforceAttendance)
    if filters:
        totals_stmt = totals_stmt.where(*filters)

    total_records, distinct_employees, sched_h, actual_h, ot_h = db.execute(totals_stmt).one()

    status_stmt = (
        select(
            WorkforceAttendance.attendance_status,
            func.count(),
            func.coalesce(func.sum(WorkforceAttendance.scheduled_hours), 0),
            func.coalesce(func.sum(WorkforceAttendance.actual_hours), 0),
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
        )
        .group_by(WorkforceAttendance.attendance_status)
        .order_by(asc(WorkforceAttendance.attendance_status))
    )
    if filters:
        status_stmt = status_stmt.where(*filters)
    by_status = [
        {
            "attendance_status": str(r[0]),
            "record_count": int(r[1]),
            "scheduled_hours": int(r[2]),
            "actual_hours": int(r[3]),
            "overtime_hours": int(r[4]),
        }
        for r in db.execute(status_stmt).all()
    ]

    present_count = 0
    absent_count = 0
    leave_count = 0
    late_count = 0
    for item in by_status:
        st = item["attendance_status"].upper()
        cnt = item["record_count"]
        if st == "PRESENT":
            present_count += cnt
        elif st == "ABSENT":
            absent_count += cnt
        elif st == "LEAVE":
            leave_count += cnt
        elif st == "LATE":
            late_count += cnt

    tot_rec = int(total_records)
    attendance_rate = round((present_count * 100.0 / tot_rec), 2) if tot_rec > 0 else 0.0

    def _group_counts(col) -> list[tuple[str, int]]:
        q = select(col, func.count()).group_by(col).order_by(asc(col))
        if filters:
            q = q.where(*filters)
        return [(str(r[0]), int(r[1])) for r in db.execute(q).all()]

    trends = _query_attendance_trends(db, filters, period)
    weekly_comparison = (
        trends if period == "weekly" else _query_attendance_trends(db, filters, "weekly")
    )

    return {
        "period": period,
        "total_records": tot_rec,
        "distinct_employees": int(distinct_employees),
        "total_scheduled_hours": int(sched_h),
        "total_actual_hours": int(actual_h),
        "total_overtime_hours": int(ot_h),
        "present_count": present_count,
        "absent_count": absent_count,
        "leave_count": leave_count,
        "late_count": late_count,
        "attendance_rate": attendance_rate,
        "by_status": by_status,
        "by_plant": _group_counts(WorkforceAttendance.plant_id),
        "by_shift": _group_counts(WorkforceAttendance.shift_id),
        "by_skill_match": [],
        "by_training_compliance": [],
        "trends": trends,
        "weekly_comparison": weekly_comparison,
        "shift_breakdown": _query_shift_breakdown(db, filters),
        "quality_counts": _query_attendance_quality_counts(db, filters),
    }
