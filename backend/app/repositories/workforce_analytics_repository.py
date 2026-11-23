"""SQLAlchemy 2.x read-only repository for the 5 workforce analytics modules."""

import datetime as dt

from sqlalchemy import asc, case, desc, distinct, func, select
from sqlalchemy.orm import Session

from app.models.attendance import WorkforceAttendance
from app.models.department import DepartmentMaster, EmployeeDepartmentMapping
from app.models.employee_master import EmployeeMaster
from app.models.experience import EmployeeExperience
from app.models.production import HourlyProduction
from app.models.section import EmployeeSectionMapping, SectionMaster
from app.models.skills import EmployeeSkillMapping
from app.models.training import EmployeeTraining
from app.models.vendor import EmployeeVendorMapping, VendorMaster
from app.models.workforce import Workforce


def _pct(part: int, total: int) -> float:
    return round((part * 100.0 / total), 1) if total > 0 else 0.0


def _subtract_one_year(d: dt.date) -> dt.date:
    try:
        return d.replace(year=d.year - 1)
    except ValueError:
        return d.replace(year=d.year - 1, day=28)


def _apply_common_filters(
    stmt,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
    emp_id_col=EmployeeMaster.employee_id,
    include_attendance_filters: bool = True,
):
    if include_attendance_filters:
        if start_date is not None:
            stmt = stmt.where(WorkforceAttendance.work_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(WorkforceAttendance.work_date <= end_date)
        if shift_id:
            stmt = stmt.where(WorkforceAttendance.shift_id == shift_id)
        if plant_id:
            stmt = stmt.where(WorkforceAttendance.plant_id == plant_id)
    else:
        if plant_id:
            stmt = stmt.where(
                emp_id_col.in_(
                    select(EmployeeMaster.employee_id).where(
                        EmployeeMaster.plant_id == plant_id
                    )
                )
            )

    if department_id:
        stmt = stmt.where(
            emp_id_col.in_(
                select(EmployeeDepartmentMapping.employee_id).where(
                    EmployeeDepartmentMapping.department_id == department_id
                )
            )
        )
    if section_id:
        stmt = stmt.where(
            emp_id_col.in_(
                select(EmployeeSectionMapping.employee_id).where(
                    EmployeeSectionMapping.section_id == section_id
                )
            )
        )
    return stmt


def get_gender_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    emp_stmt = select(
        EmployeeMaster.gender,
        func.count(distinct(EmployeeMaster.employee_id)),
    ).group_by(EmployeeMaster.gender)
    emp_stmt = _apply_common_filters(
        emp_stmt,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
        include_attendance_filters=False,
    )
    emp_counts = {str(r[0]): int(r[1]) for r in db.execute(emp_stmt).all()}

    att_stmt = (
        select(
            EmployeeMaster.gender,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)),
                0,
            ),
        )
        .join(WorkforceAttendance, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .group_by(EmployeeMaster.gender)
        .order_by(asc(EmployeeMaster.gender))
    )
    att_stmt = _apply_common_filters(
        att_stmt,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
    )

    att_map = {
        str(r[0]): (int(r[1]), int(r[2]), int(r[3])) for r in db.execute(att_stmt).all()
    }
    genders = sorted(set(emp_counts.keys()) | set(att_map.keys()))
    buckets = []
    for g in genders:
        total_rec, present_c, absent_c = att_map.get(g, (0, 0, 0))
        buckets.append(
            {
                "gender": g,
                "employee_count": emp_counts.get(g, 0),
                "total_records": total_rec,
                "present_count": present_c,
                "absent_count": absent_c,
                "attendance_pct": _pct(present_c, total_rec),
                "absenteeism_pct": _pct(absent_c, total_rec),
            }
        )
    return {
        "total_employees": sum(emp_counts.values()),
        "buckets": buckets,
    }


def _grouped_dimension_analytics(
    db: Session,
    *,
    master_id_col,
    master_name_col,
    mapping_emp_col,
    mapping_id_col,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> list[dict]:
    headcount_stmt = (
        select(
            master_id_col,
            master_name_col,
            func.count(distinct(mapping_emp_col)),
            func.count(distinct(case((EmployeeMaster.gender == "Male", mapping_emp_col)))),
            func.count(distinct(case((EmployeeMaster.gender == "Female", mapping_emp_col)))),
        )
        .select_from(master_id_col.class_)
        .outerjoin(mapping_id_col.class_, master_id_col == mapping_id_col)
        .outerjoin(EmployeeMaster, EmployeeMaster.employee_id == mapping_emp_col)
        .group_by(master_id_col, master_name_col)
        .order_by(asc(master_id_col))
    )
    headcount_stmt = _apply_common_filters(
        headcount_stmt,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
        emp_id_col=mapping_emp_col,
        include_attendance_filters=False,
    )
    headcounts = db.execute(headcount_stmt).all()

    att_stmt = (
        select(
            mapping_id_col,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)),
                0,
            ),
        )
        .join(WorkforceAttendance, WorkforceAttendance.employee_id == mapping_emp_col)
        .group_by(mapping_id_col)
    )
    att_stmt = _apply_common_filters(
        att_stmt,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
        emp_id_col=mapping_emp_col,
    )
    att_map = {str(r[0]): (int(r[1]), int(r[2]), int(r[3])) for r in db.execute(att_stmt).all()}

    items = []
    for dim_id, dim_name, emp_cnt, male_cnt, female_cnt in headcounts:
        total_rec, present_c, absent_c = att_map.get(str(dim_id), (0, 0, 0))
        items.append(
            {
                "id": str(dim_id),
                "name": str(dim_name),
                "employee_count": int(emp_cnt),
                "male_count": int(male_cnt),
                "female_count": int(female_cnt),
                "total_records": total_rec,
                "present_count": present_c,
                "absent_count": absent_c,
                "attendance_pct": _pct(present_c, total_rec),
                "absenteeism_pct": _pct(absent_c, total_rec),
            }
        )
    return items


def get_department_analytics(db: Session, **filters) -> dict:
    raw = _grouped_dimension_analytics(
        db,
        master_id_col=DepartmentMaster.department_id,
        master_name_col=DepartmentMaster.department_name,
        mapping_emp_col=EmployeeDepartmentMapping.employee_id,
        mapping_id_col=EmployeeDepartmentMapping.department_id,
        **filters,
    )
    items = [
        {
            "department_id": r["id"],
            "department_name": r["name"],
            **{k: v for k, v in r.items() if k not in {"id", "name"}},
        }
        for r in raw
    ]
    return {"total_departments": len(items), "items": items}


def get_section_analytics(db: Session, **filters) -> dict:
    raw = _grouped_dimension_analytics(
        db,
        master_id_col=SectionMaster.section_id,
        master_name_col=SectionMaster.section_name,
        mapping_emp_col=EmployeeSectionMapping.employee_id,
        mapping_id_col=EmployeeSectionMapping.section_id,
        **filters,
    )
    items = [
        {
            "section_id": r["id"],
            "section_name": r["name"],
            **{k: v for k, v in r.items() if k not in {"id", "name"}},
        }
        for r in raw
    ]
    return {"total_sections": len(items), "items": items}


def get_vendor_analytics(db: Session, *, plant_id: str | None = None) -> dict:
    """Compute vendor-wise workforce distribution from vendor_master and employee_vendor_mapping."""
    vm_stmt = select(VendorMaster).order_by(asc(VendorMaster.vendor_id))
    vendors = list(db.execute(vm_stmt).scalars().all())

    # Base filters for employee queries
    emp_filters = []
    if plant_id:
        emp_filters.append(EmployeeMaster.plant_id == plant_id)

    # 1. Total workforce counts
    tot_stmt = select(func.count(distinct(EmployeeMaster.employee_id)))
    perm_stmt = select(func.count(distinct(EmployeeMaster.employee_id))).where(EmployeeMaster.vendor_id.is_(None))
    vend_stmt = select(func.count(distinct(EmployeeMaster.employee_id))).where(EmployeeMaster.vendor_id.is_not(None))

    if emp_filters:
        tot_stmt = tot_stmt.where(*emp_filters)
        perm_stmt = perm_stmt.where(*emp_filters)
        vend_stmt = vend_stmt.where(*emp_filters)

    total_workforce = int(db.execute(tot_stmt).scalar_one())
    total_perm = int(db.execute(perm_stmt).scalar_one())
    total_vend = int(db.execute(vend_stmt).scalar_one())

    # 2. Distinct assigned and active counts per vendor
    mapping_stmt = (
        select(
            EmployeeVendorMapping.vendor_id,
            func.count(distinct(EmployeeVendorMapping.employee_id)).label("assigned_count"),
            func.count(
                distinct(
                    case(
                        (
                            (EmployeeVendorMapping.status.ilike("active")) & (EmployeeMaster.employment_status.ilike("active")),
                            EmployeeVendorMapping.employee_id,
                        )
                    )
                )
            ).label("active_count"),
            func.count(
                distinct(
                    case(
                        (
                            (EmployeeVendorMapping.status.ilike("resigned")) | (EmployeeMaster.employment_status.ilike("resigned")),
                            EmployeeVendorMapping.employee_id,
                        )
                    )
                )
            ).label("resigned_count"),
        )
        .join(EmployeeMaster, EmployeeVendorMapping.employee_id == EmployeeMaster.employee_id)
        .group_by(EmployeeVendorMapping.vendor_id)
    )
    if emp_filters:
        mapping_stmt = mapping_stmt.where(*emp_filters)

    mapping_counts = {
        r[0]: {
            "assigned": int(r[1]),
            "active": int(r[2]),
            "resigned": int(r[3]),
        }
        for r in db.execute(mapping_stmt).all()
    }

    items = []
    tot_active_vend = 0
    for v in vendors:
        counts = mapping_counts.get(v.vendor_id, {"assigned": 0, "active": 0, "resigned": 0})
        assigned = counts["assigned"]
        active = counts["active"]
        resigned = counts["resigned"]
        tot_active_vend += active
        pct = _pct(assigned, total_vend) if total_vend > 0 else 0.0

        items.append({
            "vendor_id": v.vendor_id,
            "vendor_name": v.vendor_name,
            "assigned_count": assigned,
            "active_count": active,
            "resigned_count": resigned,
            "percentage": pct,
        })

    return {
        "total_vendors": len(items),
        "total_vendor_workforce": total_vend,
        "total_active_vendor_workforce": tot_active_vend,
        "total_permanent_workforce": total_perm,
        "total_workforce": total_workforce,
        "items": items,
    }



EXPERIENCE_ORDER = [
    "0–1 Years",
    "1–3 Years",
    "3–5 Years",
    "5–7 Years",
    "Above 7 Years",
]


def get_experience_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    total_months = EmployeeExperience.experience_years * 12 + EmployeeExperience.experience_months
    bucket_case = case(
        (total_months <= 12, "0–1 Years"),
        (total_months <= 36, "1–3 Years"),
        (total_months <= 60, "3–5 Years"),
        (total_months <= 84, "5–7 Years"),
        else_="Above 7 Years",
    )

    head_stmt = (
        select(
            bucket_case.label("category"),
            func.count(distinct(EmployeeExperience.employee_id)),
            func.count(distinct(case((EmployeeMaster.gender == "Male", EmployeeExperience.employee_id)))),
            func.count(distinct(case((EmployeeMaster.gender == "Female", EmployeeExperience.employee_id)))),
        )
        .join(EmployeeMaster, EmployeeMaster.employee_id == EmployeeExperience.employee_id)
        .group_by(bucket_case)
    )
    head_stmt = _apply_common_filters(
        head_stmt,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
        emp_id_col=EmployeeExperience.employee_id,
        include_attendance_filters=False,
    )
    head_map = {
        str(r[0]): (int(r[1]), int(r[2]), int(r[3])) for r in db.execute(head_stmt).all()
    }

    att_stmt = (
        select(
            bucket_case.label("category"),
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)),
                0,
            ),
        )
        .join(WorkforceAttendance, WorkforceAttendance.employee_id == EmployeeExperience.employee_id)
        .group_by(bucket_case)
    )
    att_stmt = _apply_common_filters(
        att_stmt,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
        emp_id_col=EmployeeExperience.employee_id,
    )
    att_map = {str(r[0]): (int(r[1]), int(r[2]), int(r[3])) for r in db.execute(att_stmt).all()}

    items = []
    for cat in EXPERIENCE_ORDER:
        emp_cnt, male_cnt, female_cnt = head_map.get(cat, (0, 0, 0))
        total_rec, present_c, absent_c = att_map.get(cat, (0, 0, 0))
        items.append(
            {
                "category": cat,
                "employee_count": emp_cnt,
                "male_count": male_cnt,
                "female_count": female_cnt,
                "total_records": total_rec,
                "present_count": present_c,
                "absent_count": absent_c,
                "attendance_pct": _pct(present_c, total_rec),
                "absenteeism_pct": _pct(absent_c, total_rec),
            }
        )
    return {"items": items}


def get_new_joiner_analytics(
    db: Session,
    *,
    period: str = "weekly",
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    # Condition 7: Use reporting period start date as New Joiners calculation anchor, 12-month lookback
    anchor_date = start_date
    if anchor_date is None:
        anchor_stmt = select(func.min(WorkforceAttendance.work_date))
        if plant_id:
            anchor_stmt = anchor_stmt.where(WorkforceAttendance.plant_id == plant_id)
        anchor_date = db.execute(anchor_stmt).scalar_one()

    if anchor_date is None:
        return {
            "anchor_date": None,
            "lookback_start": None,
            "total_new_joiners": 0,
            "avg_tenure_months": None,
            "total_records": 0,
            "present_count": 0,
            "absent_count": 0,
            "attendance_pct": None,
            "absenteeism_pct": None,
            "trends": [],
        }

    lookback_start = _subtract_one_year(anchor_date)

    nj_stmt = select(
        EmployeeMaster.employee_id,
        EmployeeMaster.date_of_joining,
    ).where(
        EmployeeMaster.date_of_joining >= lookback_start,
        EmployeeMaster.date_of_joining <= anchor_date,
    )
    nj_stmt = _apply_common_filters(
        nj_stmt,
        department_id=department_id,
        section_id=section_id,
        plant_id=plant_id,
        include_attendance_filters=False,
    )
    nj_rows = db.execute(nj_stmt).all()
    nj_ids = [r[0] for r in nj_rows]
    total_nj = len(nj_ids)

    avg_tenure_months = None
    if total_nj > 0:
        avg_days = sum((anchor_date - r[1]).days for r in nj_rows) / total_nj
        avg_tenure_months = round(avg_days / 30.4375, 1)

    if total_nj == 0:
        return {
            "anchor_date": anchor_date,
            "lookback_start": lookback_start,
            "total_new_joiners": 0,
            "avg_tenure_months": None,
            "total_records": 0,
            "present_count": 0,
            "absent_count": 0,
            "attendance_pct": None,
            "absenteeism_pct": None,
            "trends": [],
        }

    totals_stmt = select(
        func.count(WorkforceAttendance.attendance_id),
        func.coalesce(
            func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)),
            0,
        ),
        func.coalesce(
            func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)),
            0,
        ),
    ).where(WorkforceAttendance.employee_id.in_(nj_ids))
    totals_stmt = _apply_common_filters(
        totals_stmt,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        plant_id=plant_id,
    )
    total_rec, present_c, absent_c = [int(x) for x in db.execute(totals_stmt).one()]

    if period == "monthly":
        bucket_expr = func.date_trunc("month", WorkforceAttendance.work_date)
    elif period == "daily":
        bucket_expr = WorkforceAttendance.work_date
    else:
        bucket_expr = func.date_trunc("week", WorkforceAttendance.work_date)

    trend_stmt = (
        select(
            bucket_expr.label("bucket"),
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)),
                0,
            ),
        )
        .where(WorkforceAttendance.employee_id.in_(nj_ids))
        .group_by(bucket_expr)
        .order_by(asc(bucket_expr))
    )
    trend_stmt = _apply_common_filters(
        trend_stmt,
        start_date=start_date,
        end_date=end_date,
        shift_id=shift_id,
        plant_id=plant_id,
    )

    trends = []
    for bucket, t_rec, p_c, a_c in db.execute(trend_stmt).all():
        b_date = bucket.date() if isinstance(bucket, dt.datetime) else bucket
        if period == "monthly":
            key = b_date.strftime("%Y-%m")
            label = b_date.strftime("%b %Y")
        elif period == "daily":
            key = b_date.isoformat()
            label = b_date.strftime("%m-%d")
        else:
            key = b_date.isoformat()
            label = f"Wk {b_date.strftime('%m-%d')}"
        trends.append(
            {
                "period_key": key,
                "label": label,
                "total_records": int(t_rec),
                "present_count": int(p_c),
                "absent_count": int(a_c),
                "attendance_pct": _pct(int(p_c), int(t_rec)),
                "absenteeism_pct": _pct(int(a_c), int(t_rec)),
            }
        )

    return {
        "anchor_date": anchor_date,
        "lookback_start": lookback_start,
        "total_new_joiners": total_nj,
        "avg_tenure_months": avg_tenure_months,
        "total_records": total_rec,
        "present_count": present_c,
        "absent_count": absent_c,
        "attendance_pct": _pct(present_c, total_rec) if total_rec > 0 else None,
        "absenteeism_pct": _pct(absent_c, total_rec) if total_rec > 0 else None,
        "trends": trends,
    }


def get_overtime_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    """Compute comprehensive overtime analytics, shift/dept/section breakdowns, and trends."""
    filters = []
    if start_date is not None:
        filters.append(WorkforceAttendance.work_date >= start_date)
    if end_date is not None:
        filters.append(WorkforceAttendance.work_date <= end_date)
    if shift_id:
        filters.append(WorkforceAttendance.shift_id == shift_id)
    if plant_id:
        filters.append(WorkforceAttendance.plant_id == plant_id)
    if department_id:
        filters.append(
            WorkforceAttendance.employee_id.in_(
                select(EmployeeDepartmentMapping.employee_id).where(
                    EmployeeDepartmentMapping.department_id == department_id
                )
            )
        )
    if section_id:
        filters.append(
            WorkforceAttendance.employee_id.in_(
                select(EmployeeSectionMapping.employee_id).where(
                    EmployeeSectionMapping.section_id == section_id
                )
            )
        )

    # 1. Overall totals
    totals_stmt = select(
        func.count(WorkforceAttendance.attendance_id),
        func.count(distinct(WorkforceAttendance.employee_id)),
        func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
        func.coalesce(func.sum(case((WorkforceAttendance.overtime_hours > 0, 1), else_=0)), 0),
        func.count(distinct(case((WorkforceAttendance.overtime_hours > 0, WorkforceAttendance.employee_id)))),
        func.coalesce(func.sum(WorkforceAttendance.scheduled_hours), 0),
        func.coalesce(func.sum(WorkforceAttendance.actual_hours), 0),
    )
    if filters:
        totals_stmt = totals_stmt.where(*filters)
    tot_rec, tot_emp, tot_ot_h, ot_rec, ot_emp, sched_h, actual_h = db.execute(totals_stmt).one()

    total_records = int(tot_rec)
    total_employees = int(tot_emp)
    total_overtime_hours = int(tot_ot_h)
    overtime_record_count = int(ot_rec)
    total_employees_with_overtime = int(ot_emp)
    overtime_rate_pct = _pct(overtime_record_count, total_records)
    avg_overtime_hours_per_employee = (
        round(total_overtime_hours / total_employees_with_overtime, 1)
        if total_employees_with_overtime > 0
        else 0.0
    )

    # 2. Shift-wise overtime
    shift_stmt = (
        select(
            WorkforceAttendance.shift_id,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
            func.coalesce(func.sum(case((WorkforceAttendance.overtime_hours > 0, 1), else_=0)), 0),
            func.count(distinct(case((WorkforceAttendance.overtime_hours > 0, WorkforceAttendance.employee_id)))),
        )
        .group_by(WorkforceAttendance.shift_id)
        .order_by(asc(WorkforceAttendance.shift_id))
    )
    if filters:
        shift_stmt = shift_stmt.where(*filters)
    shift_wise = [
        {
            "shift_id": str(r[0]),
            "total_records": int(r[1]),
            "overtime_hours": int(r[2]),
            "overtime_records": int(r[3]),
            "employees_with_overtime": int(r[4]),
            "overtime_rate_pct": _pct(int(r[3]), int(r[1])),
        }
        for r in db.execute(shift_stmt).all()
    ]

    # Subquery aggregating attendance per employee for clean dimension joins
    att_sub = select(
        WorkforceAttendance.employee_id.label("emp_id"),
        func.count(WorkforceAttendance.attendance_id).label("total_rec"),
        func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0).label("ot_h"),
        func.coalesce(func.sum(case((WorkforceAttendance.overtime_hours > 0, 1), else_=0)), 0).label("ot_rec"),
    ).group_by(WorkforceAttendance.employee_id)
    if filters:
        att_sub = att_sub.where(*filters)
    att_sub = att_sub.subquery()

    # 3. Department-wise overtime
    dept_stmt = (
        select(
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            func.count(distinct(EmployeeDepartmentMapping.employee_id)),
            func.coalesce(func.sum(att_sub.c.total_rec), 0),
            func.coalesce(func.sum(att_sub.c.ot_h), 0),
            func.coalesce(func.sum(att_sub.c.ot_rec), 0),
            func.count(distinct(case((att_sub.c.ot_h > 0, EmployeeDepartmentMapping.employee_id)))),
        )
        .outerjoin(
            EmployeeDepartmentMapping,
            DepartmentMaster.department_id == EmployeeDepartmentMapping.department_id,
        )
        .outerjoin(att_sub, EmployeeDepartmentMapping.employee_id == att_sub.c.emp_id)
        .group_by(DepartmentMaster.department_id, DepartmentMaster.department_name)
        .order_by(asc(DepartmentMaster.department_id))
    )
    if department_id:
        dept_stmt = dept_stmt.where(DepartmentMaster.department_id == department_id)
    dept_wise = [
        {
            "department_id": str(r[0]),
            "department_name": str(r[1]),
            "employee_count": int(r[2]),
            "total_records": int(r[3]),
            "overtime_hours": int(r[4]),
            "overtime_records": int(r[5]),
            "employees_with_overtime": int(r[6]),
            "overtime_rate_pct": _pct(int(r[5]), int(r[3])),
        }
        for r in db.execute(dept_stmt).all()
    ]

    # 4. Section-wise overtime
    sec_stmt = (
        select(
            SectionMaster.section_id,
            SectionMaster.section_name,
            func.count(distinct(EmployeeSectionMapping.employee_id)),
            func.coalesce(func.sum(att_sub.c.total_rec), 0),
            func.coalesce(func.sum(att_sub.c.ot_h), 0),
            func.coalesce(func.sum(att_sub.c.ot_rec), 0),
            func.count(distinct(case((att_sub.c.ot_h > 0, EmployeeSectionMapping.employee_id)))),
        )
        .outerjoin(
            EmployeeSectionMapping,
            SectionMaster.section_id == EmployeeSectionMapping.section_id,
        )
        .outerjoin(att_sub, EmployeeSectionMapping.employee_id == att_sub.c.emp_id)
        .group_by(SectionMaster.section_id, SectionMaster.section_name)
        .order_by(asc(SectionMaster.section_id))
    )
    if section_id:
        sec_stmt = sec_stmt.where(SectionMaster.section_id == section_id)
    sec_wise = [
        {
            "section_id": str(r[0]),
            "section_name": str(r[1]),
            "employee_count": int(r[2]),
            "total_records": int(r[3]),
            "overtime_hours": int(r[4]),
            "overtime_records": int(r[5]),
            "employees_with_overtime": int(r[6]),
            "overtime_rate_pct": _pct(int(r[5]), int(r[3])),
        }
        for r in db.execute(sec_stmt).all()
    ]

    # 5. Top employees with overtime (employee_wise)
    emp_ot_stmt = (
        select(
            WorkforceAttendance.employee_id,
            EmployeeMaster.employee_name,
            DepartmentMaster.department_name,
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
            func.coalesce(func.sum(case((WorkforceAttendance.overtime_hours > 0, 1), else_=0)), 0),
        )
        .join(EmployeeMaster, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .outerjoin(
            EmployeeDepartmentMapping,
            WorkforceAttendance.employee_id == EmployeeDepartmentMapping.employee_id,
        )
        .outerjoin(
            DepartmentMaster,
            EmployeeDepartmentMapping.department_id == DepartmentMaster.department_id,
        )
        .group_by(
            WorkforceAttendance.employee_id,
            EmployeeMaster.employee_name,
            DepartmentMaster.department_name,
        )
        .having(func.sum(WorkforceAttendance.overtime_hours) > 0)
        .order_by(func.sum(WorkforceAttendance.overtime_hours).desc())
        .limit(20)
    )
    if filters:
        emp_ot_stmt = emp_ot_stmt.where(*filters)
    employee_wise = [
        {
            "employee_id": str(r[0]),
            "employee_name": str(r[1]),
            "department_name": str(r[2]) if r[2] else "Unassigned",
            "overtime_hours": int(r[3]),
            "overtime_days": int(r[4]),
        }
        for r in db.execute(emp_ot_stmt).all()
    ]

    # 6. Daily trend
    daily_stmt = (
        select(
            WorkforceAttendance.work_date,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
            func.coalesce(func.sum(case((WorkforceAttendance.overtime_hours > 0, 1), else_=0)), 0),
            func.count(distinct(case((WorkforceAttendance.overtime_hours > 0, WorkforceAttendance.employee_id)))),
        )
        .group_by(WorkforceAttendance.work_date)
        .order_by(asc(WorkforceAttendance.work_date))
    )
    if filters:
        daily_stmt = daily_stmt.where(*filters)
    daily_trend = [
        {
            "date": r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0]),
            "total_records": int(r[1]),
            "overtime_hours": int(r[2]),
            "overtime_records": int(r[3]),
            "employees_with_overtime": int(r[4]),
        }
        for r in db.execute(daily_stmt).all()
    ]

    # 7. Monthly trend
    month_expr = func.date_trunc("month", WorkforceAttendance.work_date)
    month_stmt = (
        select(
            month_expr,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
            func.coalesce(func.sum(case((WorkforceAttendance.overtime_hours > 0, 1), else_=0)), 0),
            func.count(distinct(case((WorkforceAttendance.overtime_hours > 0, WorkforceAttendance.employee_id)))),
        )
        .group_by(month_expr)
        .order_by(asc(month_expr))
    )
    if filters:
        month_stmt = month_stmt.where(*filters)
    monthly_trend = []
    for r in db.execute(month_stmt).all():
        m_date = r[0].date() if isinstance(r[0], dt.datetime) else r[0]
        monthly_trend.append(
            {
                "month": m_date.strftime("%Y-%m"),
                "label": m_date.strftime("%b %Y"),
                "total_records": int(r[1]),
                "overtime_hours": int(r[2]),
                "overtime_records": int(r[3]),
                "employees_with_overtime": int(r[4]),
            }
        )

    # 8. Overtime distribution (by hours bucket)
    dist_stmt = (
        select(
            WorkforceAttendance.overtime_hours,
            func.count(WorkforceAttendance.attendance_id),
            func.count(distinct(WorkforceAttendance.employee_id)),
        )
        .group_by(WorkforceAttendance.overtime_hours)
        .order_by(asc(WorkforceAttendance.overtime_hours))
    )
    if filters:
        dist_stmt = dist_stmt.where(*filters)
    overtime_distribution = [
        {
            "overtime_hours": int(r[0]),
            "record_count": int(r[1]),
            "employee_count": int(r[2]),
            "percentage": _pct(int(r[1]), total_records),
        }
        for r in db.execute(dist_stmt).all()
    ]

    # 9. Vendor-wise overtime and employment type share
    from app.models.vendor import VendorMaster
    v_stmt = (
        select(
            VendorMaster.vendor_id,
            VendorMaster.vendor_name,
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
            func.count(distinct(WorkforceAttendance.employee_id)),
        )
        .join(EmployeeMaster, WorkforceAttendance.employee_id == EmployeeMaster.employee_id)
        .join(VendorMaster, EmployeeMaster.vendor_id == VendorMaster.vendor_id)
        .group_by(VendorMaster.vendor_id, VendorMaster.vendor_name)
        .order_by(desc(func.sum(WorkforceAttendance.overtime_hours)))
    )
    if filters:
        v_stmt = v_stmt.where(*filters)
    vendor_wise = [
        {
            "vendor_id": str(r[0]),
            "vendor_name": str(r[1]),
            "overtime_hours": int(r[2]),
            "employee_count": int(r[3]),
        }
        for r in db.execute(v_stmt).all()
    ]

    emp_type_stmt = (
        select(
            WorkforceAttendance.employment_type,
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
        )
        .group_by(WorkforceAttendance.employment_type)
    )
    if filters:
        emp_type_stmt = emp_type_stmt.where(*filters)
    vend_ot_h = 0
    perm_ot_h = 0
    for r in db.execute(emp_type_stmt).all():
        e_type = str(r[0] or "").lower()
        if "vend" in e_type:
            vend_ot_h = int(r[1])
        elif "perm" in e_type:
            perm_ot_h = int(r[1])
    
    tot_comb_ot = vend_ot_h + perm_ot_h
    vendor_ot_pct = _pct(vend_ot_h, tot_comb_ot) if tot_comb_ot > 0 else 0.0
    perm_ot_pct = _pct(perm_ot_h, tot_comb_ot) if tot_comb_ot > 0 else 0.0

    return {
        "total_overtime_hours": total_overtime_hours,
        "total_employees_with_overtime": total_employees_with_overtime,
        "overtime_record_count": overtime_record_count,
        "total_attendance_records": total_records,
        "total_employees": total_employees,
        "overtime_rate_pct": overtime_rate_pct,
        "avg_overtime_hours_per_employee": avg_overtime_hours_per_employee,
        "shift_wise": shift_wise,
        "department_wise": dept_wise,
        "section_wise": sec_wise,
        "employee_wise": employee_wise,
        "vendor_wise": vendor_wise,
        "vendor_overtime_hours": vend_ot_h,
        "permanent_overtime_hours": perm_ot_h,
        "vendor_ot_pct": vendor_ot_pct,
        "permanent_ot_pct": perm_ot_pct,
        "daily_trend": daily_trend,
        "monthly_trend": monthly_trend,
        "overtime_distribution": overtime_distribution,
    }


def get_team_production_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
    operator_team: str | None = None,
) -> dict:
    """Compute team production metrics and independent team attendance correlation."""
    prod_filters = []
    if start_date is not None:
        prod_filters.append(HourlyProduction.event_date >= start_date)
    if end_date is not None:
        prod_filters.append(HourlyProduction.event_date <= end_date)
    if plant_id:
        prod_filters.append(HourlyProduction.plant_id == plant_id)
    if shift_id:
        prod_filters.append(HourlyProduction.shift_id == shift_id)
    if operator_team:
        prod_filters.append(HourlyProduction.operator_team == operator_team)

    # 1. Independent Production Aggregates by Team
    prod_stmt = (
        select(
            HourlyProduction.operator_team,
            func.coalesce(func.sum(HourlyProduction.target_qty), 0),
            func.coalesce(func.sum(HourlyProduction.actual_qty), 0),
            func.coalesce(func.sum(HourlyProduction.good_qty), 0),
            func.coalesce(func.sum(HourlyProduction.reject_qty), 0),
            func.coalesce(func.sum(HourlyProduction.rework_qty), 0),
            func.coalesce(func.sum(HourlyProduction.downtime_min), 0),
            func.count(HourlyProduction.event_id),
        )
        .group_by(HourlyProduction.operator_team)
        .order_by(asc(HourlyProduction.operator_team))
    )
    if prod_filters:
        prod_stmt = prod_stmt.where(*prod_filters)
    prod_map = {
        str(r[0]): {
            "target_qty": int(r[1]),
            "actual_qty": int(r[2]),
            "good_qty": int(r[3]),
            "reject_qty": int(r[4]),
            "rework_qty": int(r[5]),
            "downtime_min": int(r[6]),
            "event_count": int(r[7]),
        }
        for r in db.execute(prod_stmt).all()
    }

    # 2. Team Headcount from dim_workforce
    hc_stmt = (
        select(
            Workforce.team_id,
            func.count(distinct(Workforce.employee_id)),
        )
        .group_by(Workforce.team_id)
        .order_by(asc(Workforce.team_id))
    )
    if operator_team:
        hc_stmt = hc_stmt.where(Workforce.team_id == operator_team)
    headcounts = {str(r[0]): int(r[1]) for r in db.execute(hc_stmt).all()}

    # 3. Independent Attendance Aggregates by Team
    att_filters = []
    if start_date is not None:
        att_filters.append(WorkforceAttendance.work_date >= start_date)
    if end_date is not None:
        att_filters.append(WorkforceAttendance.work_date <= end_date)
    if plant_id:
        att_filters.append(WorkforceAttendance.plant_id == plant_id)
    if shift_id:
        att_filters.append(WorkforceAttendance.shift_id == shift_id)
    if operator_team:
        att_filters.append(Workforce.team_id == operator_team)

    att_stmt = (
        select(
            Workforce.team_id,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)), 0),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)), 0),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "LATE", 1), else_=0)), 0),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "LEAVE", 1), else_=0)), 0),
        )
        .join(Workforce, WorkforceAttendance.employee_id == Workforce.employee_id)
        .group_by(Workforce.team_id)
        .order_by(asc(Workforce.team_id))
    )
    if att_filters:
        att_stmt = att_stmt.where(*att_filters)
    att_map = {
        str(r[0]): {
            "total_records": int(r[1]),
            "present_count": int(r[2]),
            "absent_count": int(r[3]),
            "late_count": int(r[4]),
            "leave_count": int(r[5]),
        }
        for r in db.execute(att_stmt).all()
    }

    # 4. Join aggregates
    all_teams = sorted(set(prod_map.keys()) | set(headcounts.keys()) | set(att_map.keys()))
    items = []
    tot_target = 0
    tot_actual = 0
    tot_good = 0
    tot_reject = 0
    tot_rework = 0
    tot_downtime = 0
    tot_present = 0
    tot_absent = 0
    tot_records = 0

    for tm in all_teams:
        p = prod_map.get(
            tm,
            {"target_qty": 0, "actual_qty": 0, "good_qty": 0, "reject_qty": 0, "rework_qty": 0, "downtime_min": 0, "event_count": 0},
        )
        a = att_map.get(
            tm,
            {"total_records": 0, "present_count": 0, "absent_count": 0, "late_count": 0, "leave_count": 0},
        )
        hc = headcounts.get(tm, 0)

        target_q = p["target_qty"]
        actual_q = p["actual_qty"]
        good_q = p["good_qty"]
        reject_q = p["reject_qty"]
        rework_q = p["rework_qty"]
        dt_min = p["downtime_min"]
        pres_c = a["present_count"]
        abs_c = a["absent_count"]
        rec_c = a["total_records"]

        tot_target += target_q
        tot_actual += actual_q
        tot_good += good_q
        tot_reject += reject_q
        tot_rework += rework_q
        tot_downtime += dt_min
        tot_present += pres_c
        tot_absent += abs_c
        tot_records += rec_c

        achievement_pct = round((actual_q * 100.0 / target_q), 1) if target_q > 0 else 0.0
        prod_per_present = round((actual_q / pres_c), 1) if pres_c > 0 else 0.0
        att_pct = _pct(pres_c, rec_c)

        items.append({
            "operator_team": tm,
            "headcount": hc,
            "target_qty": target_q,
            "actual_qty": actual_q,
            "good_qty": good_q,
            "reject_qty": reject_q,
            "rework_qty": rework_q,
            "downtime_min": dt_min,
            "production_achievement_pct": achievement_pct,
            "present_employee_count": pres_c,
            "absent_employee_count": abs_c,
            "production_per_present_employee": prod_per_present,
            "attendance_pct": att_pct,
        })

    return {
        "total_teams": len(items),
        "total_target_qty": tot_target,
        "total_actual_qty": tot_actual,
        "total_good_qty": tot_good,
        "total_reject_qty": tot_reject,
        "total_rework_qty": tot_rework,
        "total_downtime_min": tot_downtime,
        "overall_achievement_pct": round((tot_actual * 100.0 / tot_target), 1) if tot_target > 0 else 0.0,
        "total_present_employees": tot_present,
        "total_absent_employees": tot_absent,
        "overall_production_per_present_employee": round((tot_actual / tot_present), 1) if tot_present > 0 else 0.0,
        "items": items,
        "attribution_note": "Production is recorded at operator-team level; production per present employee reflects team throughput divided by present team members, not individual operator output.",
    }


def get_shift_efficiency_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    plant_id: str | None = None,
    shift_id: str | None = None,
) -> dict:
    """Compute shift-wise production performance correlated with shift-level attendance."""
    prod_filters = []
    if start_date is not None:
        prod_filters.append(HourlyProduction.event_date >= start_date)
    if end_date is not None:
        prod_filters.append(HourlyProduction.event_date <= end_date)
    if plant_id:
        prod_filters.append(HourlyProduction.plant_id == plant_id)
    if shift_id:
        prod_filters.append(HourlyProduction.shift_id == shift_id)

    # 1. Independent Shift Production Aggregates
    prod_stmt = (
        select(
            HourlyProduction.shift_id,
            func.coalesce(func.sum(HourlyProduction.target_qty), 0),
            func.coalesce(func.sum(HourlyProduction.actual_qty), 0),
            func.coalesce(func.sum(HourlyProduction.good_qty), 0),
            func.coalesce(func.sum(HourlyProduction.reject_qty), 0),
            func.coalesce(func.sum(HourlyProduction.rework_qty), 0),
            func.coalesce(func.sum(HourlyProduction.downtime_min), 0),
            func.count(HourlyProduction.event_id),
        )
        .group_by(HourlyProduction.shift_id)
        .order_by(asc(HourlyProduction.shift_id))
    )
    if prod_filters:
        prod_stmt = prod_stmt.where(*prod_filters)
    prod_map = {
        str(r[0]): {
            "target_qty": int(r[1]),
            "actual_qty": int(r[2]),
            "good_qty": int(r[3]),
            "reject_qty": int(r[4]),
            "rework_qty": int(r[5]),
            "downtime_min": int(r[6]),
            "events": int(r[7]),
        }
        for r in db.execute(prod_stmt).all()
    }

    # 2. Independent Shift Attendance Aggregates
    att_filters = []
    if start_date is not None:
        att_filters.append(WorkforceAttendance.work_date >= start_date)
    if end_date is not None:
        att_filters.append(WorkforceAttendance.work_date <= end_date)
    if plant_id:
        att_filters.append(WorkforceAttendance.plant_id == plant_id)
    if shift_id:
        att_filters.append(WorkforceAttendance.shift_id == shift_id)

    att_stmt = (
        select(
            WorkforceAttendance.shift_id,
            func.count(WorkforceAttendance.attendance_id),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "PRESENT", 1), else_=0)), 0),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "ABSENT", 1), else_=0)), 0),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "LATE", 1), else_=0)), 0),
            func.coalesce(func.sum(case((func.upper(WorkforceAttendance.attendance_status) == "LEAVE", 1), else_=0)), 0),
            func.coalesce(func.sum(WorkforceAttendance.overtime_hours), 0),
        )
        .group_by(WorkforceAttendance.shift_id)
        .order_by(asc(WorkforceAttendance.shift_id))
    )
    if att_filters:
        att_stmt = att_stmt.where(*att_filters)
    att_map = {
        str(r[0]): {
            "total_records": int(r[1]),
            "present_count": int(r[2]),
            "absent_count": int(r[3]),
            "late_count": int(r[4]),
            "leave_count": int(r[5]),
            "overtime_hours": int(r[6]),
        }
        for r in db.execute(att_stmt).all()
    }

    # 3. Join by shift_id
    all_shifts = sorted(set(prod_map.keys()) | set(att_map.keys()))
    items = []
    tot_target = 0
    tot_actual = 0
    tot_good = 0
    tot_reject = 0
    tot_rework = 0
    tot_downtime = 0
    tot_present = 0
    tot_absent = 0
    tot_records = 0

    for s in all_shifts:
        p = prod_map.get(
            s,
            {"target_qty": 0, "actual_qty": 0, "good_qty": 0, "reject_qty": 0, "rework_qty": 0, "downtime_min": 0, "events": 0},
        )
        a = att_map.get(
            s,
            {"total_records": 0, "present_count": 0, "absent_count": 0, "late_count": 0, "leave_count": 0, "overtime_hours": 0},
        )

        target_q = p["target_qty"]
        actual_q = p["actual_qty"]
        good_q = p["good_qty"]
        reject_q = p["reject_qty"]
        rework_q = p["rework_qty"]
        dt_min = p["downtime_min"]
        pres_c = a["present_count"]
        abs_c = a["absent_count"]
        rec_c = a["total_records"]

        tot_target += target_q
        tot_actual += actual_q
        tot_good += good_q
        tot_reject += reject_q
        tot_rework += rework_q
        tot_downtime += dt_min
        tot_present += pres_c
        tot_absent += abs_c
        tot_records += rec_c

        achievement_pct = round((actual_q * 100.0 / target_q), 1) if target_q > 0 else 0.0
        prod_per_present = round((actual_q / pres_c), 1) if pres_c > 0 else 0.0
        att_pct = _pct(pres_c, rec_c)
        abs_pct = _pct(abs_c, rec_c)

        items.append({
            "shift_id": s,
            "target_qty": target_q,
            "actual_qty": actual_q,
            "good_qty": good_q,
            "reject_qty": reject_q,
            "rework_qty": rework_q,
            "downtime_min": dt_min,
            "production_achievement_pct": achievement_pct,
            "present_employees": pres_c,
            "absent_employees": abs_c,
            "late_employees": a["late_count"],
            "leave_employees": a["leave_count"],
            "total_attendance_records": rec_c,
            "attendance_pct": att_pct,
            "absenteeism_pct": abs_pct,
            "production_per_present_employee": prod_per_present,
        })

    return {
        "total_shifts": len(items),
        "total_target_qty": tot_target,
        "total_actual_qty": tot_actual,
        "total_good_qty": tot_good,
        "total_reject_qty": tot_reject,
        "total_rework_qty": tot_rework,
        "total_downtime_min": tot_downtime,
        "overall_achievement_pct": round((tot_actual * 100.0 / tot_target), 1) if tot_target > 0 else 0.0,
        "total_present_employees": tot_present,
        "total_absent_employees": tot_absent,
        "overall_production_per_present_employee": round((tot_actual / tot_present), 1) if tot_present > 0 else 0.0,
        "items": items,
        "productivity_note": "Production per present employee is a shift-level throughput indicator (actual production divided by present attendance count), not individual operator output.",
    }


def get_skills_analytics(
    db: Session,
    *,
    department_id: str | None = None,
    section_id: str | None = None,
    team_id: str | None = None,
    shift_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    """Compute skill grade distributions, department/section/team skill matrices, and certification analytics."""
    emp_filters = []
    if plant_id:
        emp_filters.append(
            Workforce.employee_id.in_(
                select(WorkforceAttendance.employee_id).where(
                    WorkforceAttendance.plant_id == plant_id
                ).distinct()
            )
        )
    if team_id:
        emp_filters.append(Workforce.team_id == team_id)
    if shift_id:
        emp_filters.append(Workforce.home_shift == shift_id)
    if department_id:
        emp_filters.append(
            Workforce.employee_id.in_(
                select(EmployeeDepartmentMapping.employee_id).where(
                    EmployeeDepartmentMapping.department_id == department_id
                )
            )
        )
    if section_id:
        emp_filters.append(
            Workforce.employee_id.in_(
                select(EmployeeSectionMapping.employee_id).where(
                    EmployeeSectionMapping.section_id == section_id
                )
            )
        )

    # 1. Total employees
    tot_stmt = select(func.count(Workforce.employee_id))
    if emp_filters:
        tot_stmt = tot_stmt.where(*emp_filters)
    total_employees = int(db.execute(tot_stmt).scalar_one())

    # 2. Skill Grade Distribution (L1, L2, L3, L4)
    sg_stmt = (
        select(Workforce.skill_grade, func.count(Workforce.employee_id))
        .group_by(Workforce.skill_grade)
        .order_by(asc(Workforce.skill_grade))
    )
    if emp_filters:
        sg_stmt = sg_stmt.where(*emp_filters)
    skill_grade_distribution = [
        {
            "skill_grade": str(r[0]),
            "employee_count": int(r[1]),
            "percentage": _pct(int(r[1]), total_employees),
        }
        for r in db.execute(sg_stmt).all()
    ]

    # 3. Department-wise skill grade distribution
    dept_sg_stmt = (
        select(
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            func.coalesce(func.sum(case((Workforce.skill_grade == "L1", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L2", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L3", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L4", 1), else_=0)), 0),
            func.count(Workforce.employee_id),
        )
        .join(EmployeeDepartmentMapping, DepartmentMaster.department_id == EmployeeDepartmentMapping.department_id)
        .join(Workforce, EmployeeDepartmentMapping.employee_id == Workforce.employee_id)
        .group_by(DepartmentMaster.department_id, DepartmentMaster.department_name)
        .order_by(asc(DepartmentMaster.department_id))
    )
    if emp_filters:
        dept_sg_stmt = dept_sg_stmt.where(*emp_filters)
    department_skills = [
        {
            "department_id": str(r[0]),
            "department_name": str(r[1]),
            "l1_count": int(r[2]),
            "l2_count": int(r[3]),
            "l3_count": int(r[4]),
            "l4_count": int(r[5]),
            "total_employees": int(r[6]),
        }
        for r in db.execute(dept_sg_stmt).all()
    ]

    # 4. Section-wise skill grade distribution
    sec_sg_stmt = (
        select(
            SectionMaster.section_id,
            SectionMaster.section_name,
            func.coalesce(func.sum(case((Workforce.skill_grade == "L1", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L2", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L3", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L4", 1), else_=0)), 0),
            func.count(Workforce.employee_id),
        )
        .join(EmployeeSectionMapping, SectionMaster.section_id == EmployeeSectionMapping.section_id)
        .join(Workforce, EmployeeSectionMapping.employee_id == Workforce.employee_id)
        .group_by(SectionMaster.section_id, SectionMaster.section_name)
        .order_by(asc(SectionMaster.section_id))
    )
    if emp_filters:
        sec_sg_stmt = sec_sg_stmt.where(*emp_filters)
    section_skills = [
        {
            "section_id": str(r[0]),
            "section_name": str(r[1]),
            "l1_count": int(r[2]),
            "l2_count": int(r[3]),
            "l3_count": int(r[4]),
            "l4_count": int(r[5]),
            "total_employees": int(r[6]),
        }
        for r in db.execute(sec_sg_stmt).all()
    ]

    # 5. Team-wise skill grade distribution
    team_sg_stmt = (
        select(
            Workforce.team_id,
            func.coalesce(func.sum(case((Workforce.skill_grade == "L1", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L2", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L3", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Workforce.skill_grade == "L4", 1), else_=0)), 0),
            func.count(Workforce.employee_id),
        )
        .group_by(Workforce.team_id)
        .order_by(asc(Workforce.team_id))
    )
    if emp_filters:
        team_sg_stmt = team_sg_stmt.where(*emp_filters)
    team_skills = [
        {
            "team_id": str(r[0]),
            "l1_count": int(r[1]),
            "l2_count": int(r[2]),
            "l3_count": int(r[3]),
            "l4_count": int(r[4]),
            "total_employees": int(r[5]),
        }
        for r in db.execute(team_sg_stmt).all()
    ]

    # 6. Certification distribution
    cert_stmt = (
        select(
            EmployeeSkillMapping.certification,
            func.count(distinct(EmployeeSkillMapping.employee_id)),
        )
        .where(EmployeeSkillMapping.certification.isnot(None))
        .group_by(EmployeeSkillMapping.certification)
        .order_by(func.count(distinct(EmployeeSkillMapping.employee_id)).desc())
    )
    certifications = [
        {
            "certification": str(r[0]),
            "employee_count": int(r[1]),
            "percentage": _pct(int(r[1]), total_employees),
        }
        for r in db.execute(cert_stmt).all()
        if r[0] and str(r[0]).strip()
    ]

    # 7. Active employee skill distribution
    active_filters = list(emp_filters) + [func.upper(Workforce.active_status) == "ACTIVE"]
    act_stmt = (
        select(
            Workforce.skill_grade,
            func.count(Workforce.employee_id),
        )
        .where(*active_filters)
        .group_by(Workforce.skill_grade)
        .order_by(asc(Workforce.skill_grade))
    )
    active_skills = [
        {
            "skill_grade": str(r[0]),
            "employee_count": int(r[1]),
            "percentage": _pct(int(r[1]), total_employees),
        }
        for r in db.execute(act_stmt).all()
    ]

    return {
        "total_employees": total_employees,
        "skill_grade_distribution": skill_grade_distribution,
        "department_skills": department_skills,
        "section_skills": section_skills,
        "team_skills": team_skills,
        "certification_distribution": certifications,
        "active_skill_distribution": active_skills,
    }


def get_compliance_analytics(
    db: Session,
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    shift_id: str | None = None,
    department_id: str | None = None,
    section_id: str | None = None,
    plant_id: str | None = None,
) -> dict:
    """Compute training compliance and skill match rates across departments, sections, and shifts."""
    trn_filters = []
    if plant_id:
        trn_filters.append(EmployeeMaster.plant_id == plant_id)
    if shift_id:
        trn_filters.append(EmployeeMaster.shift_id == shift_id)
    if department_id:
        trn_filters.append(EmployeeMaster.department_id == department_id)
    if section_id:
        trn_filters.append(EmployeeMaster.section_id == section_id)
    if start_date is not None:
        trn_filters.append(EmployeeTraining.start_date >= start_date)
    if end_date is not None:
        trn_filters.append(EmployeeTraining.end_date <= end_date)

    # 1. Overall compliance & skill match totals from verified employee_training records
    tot_stmt = (
        select(
            func.count(EmployeeTraining.training_id),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status.in_(["Valid", "Completed", "Expiring Soon"]), 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status == "Expired", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Pass", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Fail", 1), else_=0)), 0),
        )
        .join(EmployeeMaster, EmployeeTraining.employee_id == EmployeeMaster.employee_id)
    )
    if trn_filters:
        tot_stmt = tot_stmt.where(*trn_filters)
    tot_rec, cur_c, exp_c, match_c, gap_c = db.execute(tot_stmt).one()

    total_records = int(tot_rec)
    current_count = int(cur_c)
    expired_count = int(exp_c)
    matched_count = int(match_c)
    gap_count = int(gap_c)

    # Denominator rules:
    total_compliance_eligible = current_count + expired_count
    training_compliance_pct = _pct(current_count, total_compliance_eligible)

    total_skill_eligible = matched_count + gap_count
    skill_match_pct = _pct(matched_count, total_skill_eligible)

    # 2. Shift-wise compliance
    shift_stmt = (
        select(
            EmployeeMaster.shift_id,
            func.count(EmployeeTraining.training_id),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status.in_(["Valid", "Completed", "Expiring Soon"]), 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status == "Expired", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Pass", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Fail", 1), else_=0)), 0),
        )
        .join(EmployeeMaster, EmployeeTraining.employee_id == EmployeeMaster.employee_id)
        .group_by(EmployeeMaster.shift_id)
        .order_by(asc(EmployeeMaster.shift_id))
    )
    if trn_filters:
        shift_stmt = shift_stmt.where(*trn_filters)
    shift_wise = []
    for r in db.execute(shift_stmt).all():
        s_tot = int(r[1])
        s_cur = int(r[2])
        s_exp = int(r[3])
        s_mat = int(r[4])
        s_gap = int(r[5])
        shift_wise.append({
            "shift_id": str(r[0]),
            "total_records": s_tot,
            "current_count": s_cur,
            "expired_count": s_exp,
            "compliance_pct": _pct(s_cur, s_cur + s_exp),
            "matched_count": s_mat,
            "gap_count": s_gap,
            "skill_match_pct": _pct(s_mat, s_mat + s_gap),
        })

    # 3. Department-wise compliance
    dept_stmt = (
        select(
            DepartmentMaster.department_id,
            DepartmentMaster.department_name,
            func.count(EmployeeTraining.training_id),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status.in_(["Valid", "Completed", "Expiring Soon"]), 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status == "Expired", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Pass", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Fail", 1), else_=0)), 0),
        )
        .join(EmployeeMaster, EmployeeTraining.employee_id == EmployeeMaster.employee_id)
        .join(DepartmentMaster, EmployeeMaster.department_id == DepartmentMaster.department_id)
        .group_by(DepartmentMaster.department_id, DepartmentMaster.department_name)
        .order_by(asc(DepartmentMaster.department_id))
    )
    if trn_filters:
        dept_stmt = dept_stmt.where(*trn_filters)
    dept_wise = []
    for r in db.execute(dept_stmt).all():
        d_tot = int(r[2])
        d_cur = int(r[3])
        d_exp = int(r[4])
        d_mat = int(r[5])
        d_gap = int(r[6])
        dept_wise.append({
            "department_id": str(r[0]),
            "department_name": str(r[1]),
            "total_records": d_tot,
            "current_count": d_cur,
            "expired_count": d_exp,
            "compliance_pct": _pct(d_cur, d_cur + d_exp),
            "matched_count": d_mat,
            "gap_count": d_gap,
            "skill_match_pct": _pct(d_mat, d_mat + d_gap),
        })

    # 4. Section-wise compliance
    sec_stmt = (
        select(
            SectionMaster.section_id,
            SectionMaster.section_name,
            func.count(EmployeeTraining.training_id),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status.in_(["Valid", "Completed", "Expiring Soon"]), 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status == "Expired", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Pass", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Fail", 1), else_=0)), 0),
        )
        .join(EmployeeMaster, EmployeeTraining.employee_id == EmployeeMaster.employee_id)
        .join(SectionMaster, EmployeeMaster.section_id == SectionMaster.section_id)
        .group_by(SectionMaster.section_id, SectionMaster.section_name)
        .order_by(asc(SectionMaster.section_id))
    )
    if trn_filters:
        sec_stmt = sec_stmt.where(*trn_filters)
    sec_wise = []
    for r in db.execute(sec_stmt).all():
        s_tot = int(r[2])
        s_cur = int(r[3])
        s_exp = int(r[4])
        s_mat = int(r[5])
        s_gap = int(r[6])
        sec_wise.append({
            "section_id": str(r[0]),
            "section_name": str(r[1]),
            "total_records": s_tot,
            "current_count": s_cur,
            "expired_count": s_exp,
            "compliance_pct": _pct(s_cur, s_cur + s_exp),
            "matched_count": s_mat,
            "gap_count": s_gap,
            "skill_match_pct": _pct(s_mat, s_mat + s_gap),
        })

    # 5. Daily trend
    daily_stmt = (
        select(
            EmployeeTraining.start_date,
            func.count(EmployeeTraining.training_id),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status.in_(["Valid", "Completed", "Expiring Soon"]), 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.certification_status == "Expired", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Pass", 1), else_=0)), 0),
            func.coalesce(func.sum(case((EmployeeTraining.result == "Fail", 1), else_=0)), 0),
        )
        .join(EmployeeMaster, EmployeeTraining.employee_id == EmployeeMaster.employee_id)
        .group_by(EmployeeTraining.start_date)
        .order_by(asc(EmployeeTraining.start_date))
    )
    if trn_filters:
        daily_stmt = daily_stmt.where(*trn_filters)
    daily_trend = []
    for r in db.execute(daily_stmt).all():
        t_tot = int(r[1])
        t_cur = int(r[2])
        t_exp = int(r[3])
        t_mat = int(r[4])
        t_gap = int(r[5])
        daily_trend.append({
            "date": r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0]),
            "total_records": t_tot,
            "current_count": t_cur,
            "expired_count": t_exp,
            "compliance_pct": _pct(t_cur, t_cur + t_exp),
            "matched_count": t_mat,
            "gap_count": t_gap,
            "skill_match_pct": _pct(t_mat, t_mat + t_gap),
        })

    return {
        "total_compliance_records": total_compliance_eligible,
        "current_count": current_count,
        "expired_count": expired_count,
        "training_compliance_pct": training_compliance_pct,
        "total_skill_match_records": total_skill_eligible,
        "matched_count": matched_count,
        "gap_count": gap_count,
        "skill_match_pct": skill_match_pct,
        "department_wise": dept_wise,
        "section_wise": sec_wise,
        "shift_wise": shift_wise,
        "daily_trend": daily_trend,
        "denominator_note": "Training compliance % denominator is (CURRENT + EXPIRED); Skill match % denominator is (MATCHED + GAP). Computed directly from employee_training in Neon DB.",
    }


